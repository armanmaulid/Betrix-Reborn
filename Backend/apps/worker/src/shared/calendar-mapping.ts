import pino from 'pino';
import { CalendarEvent, type CalendarEventImportance } from '@betrix/domain';
import {
  FxMacroDataClient,
  type FxMacroDataCalendarEvent,
  type FxMacroDataAnnouncement,
  type FxMacroDataPredictionGroup
} from '@betrix/infra';

/**
 * Priority order for selecting a single forecast value out of the multiple
 * prediction_types FXMacroData may return for one announcement_id. A real
 * market consensus (from a professional-forecaster survey) always wins over
 * FXMacroData's own statistical model — never averaged, never silently
 * substituted without recording which one was used (see forecastType on
 * CalendarEvent).
 */
// FXMacroData exposes up to 9 prediction_type values; the previous list only
// handled 2, so forecasts from surveys / central banks / IMF / OECD were left
// NULL (the "too few forecasts" symptom). Rank by source authority: a real
// consensus/survey wins over a single institution's own model, never averaged.
const FORECAST_TYPE_PRIORITY: FxMacroDataPredictionGroup['predictions'][number]['prediction_type'][] =
  [
    'market_consensus',
    'survey',
    'central_bank_forecast',
    'central_bank_projection',
    'imf_weo',
    'oecd_eo',
    'market_prediction',
    'model_nowcast',
    'fxmacrodata'
  ];

export function pickForecast(group: FxMacroDataPredictionGroup | undefined): {
  value: number | null;
  type: string | null;
} {
  if (!group) return { value: null, type: null };
  for (const type of FORECAST_TYPE_PRIORITY) {
    const match = group.predictions.find((p) => p.prediction_type === type);
    if (match) return { value: match.predicted_value, type: match.prediction_type };
  }
  return { value: null, type: null };
}

/**
 * Schedule-only seeding helpers (CalendarSeederWorker). One /v1/calendar call
 * returns the release schedule WITHOUT Before/Forecast/Actual — passing
 * undefined announcement/prediction through toCalendarEvent yields exactly
 * those rows, and the periodic value-refresh pass fills values later.
 */

export function toScheduleOnlyEvents(
  rawEvents: FxMacroDataCalendarEvent[],
  currency: string
): CalendarEvent[] {
  return rawEvents.map((raw) => toCalendarEvent(raw, currency.toUpperCase(), undefined, undefined));
}

export function toCalendarEvent(
  raw: FxMacroDataCalendarEvent,
  currency: string,
  announcement: FxMacroDataAnnouncement | undefined,
  predictionGroup: FxMacroDataPredictionGroup | undefined
): CalendarEvent {
  const forecast = pickForecast(predictionGroup);
  return new CalendarEvent({
    id: `${currency.toLowerCase()}_${raw.release}_${raw.date}`,
    currency,
    eventCode: raw.release,
    eventName: raw.name,
    referencePeriodDate: raw.date,
    announcementUnix: raw.announcement_datetime,
    announcementDatetimeUtc: raw.announcement_datetime_utc,
    announcementDatetimeLocal: raw.announcement_datetime_local,
    // FXMacroData may return null importance/tier; the DB column is NOT NULL,
    // so fall back to safe defaults instead of inserting NULL and dropping the row.
    importance: (raw.event_importance as CalendarEventImportance) ?? 'low',
    marketTier: raw.market_tier ?? 0,
    isTopTier: raw.top_tier_for_currency ?? false,
    sourceName: raw.source ?? null,
    sourceUrl: raw.source_url ?? null,
    beforeValue: announcement?.previous_value ?? null,
    forecastValue: forecast.value,
    forecastType: forecast.type,
    actualValue: announcement?.val ?? null,
    hasOfficialForecast: announcement?.has_official_forecast ?? false
  });
}

/**
 * Deduplicates by eventCode before fetching announcements/predictions — one
 * indicator (e.g. non_farm_payrolls) recurs many times a year but is only
 * fetched once, to stay within FXMacroData's 100 req/day free-tier limit.
 * A failure fetching announcements/predictions for one indicator does not
 * fail the whole batch — that indicator's before/forecast/actual values
 * simply stay null. Shared between CalendarWorker's daily sync and the
 * one-time backfill script so this logic is written exactly once.
 */
export async function joinWithAnnouncementsAndPredictions(
  fxMacroData: FxMacroDataClient,
  rawEvents: FxMacroDataCalendarEvent[],
  currency: string,
  logger: pino.Logger
): Promise<CalendarEvent[]> {
  // FXMacroData identifiers are lowercase (e.g. announcement_id "usd_inflation_2026-01-31"),
  // so the value endpoints must be called with the lowercase currency — otherwise the
  // join silently fails and Before/Actual/Forecast stay NULL.
  const currencyKey = currency.toLowerCase();
  const uniqueEventCodes = [...new Set(rawEvents.map((e) => e.release))];
  const announcementsByCode = new Map<string, FxMacroDataAnnouncement[]>();
  const predictionsByCode = new Map<string, FxMacroDataPredictionGroup[]>();

  for (const code of uniqueEventCodes) {
    try {
      announcementsByCode.set(code, await fxMacroData.fetchAnnouncements(currencyKey, code));
    } catch (err: any) {
      logger.warn(
        { err: err.message },
        `Failed to fetch announcements for indicator '${code}' — before/actual will stay null.`
      );
      announcementsByCode.set(code, []);
    }
    try {
      predictionsByCode.set(code, await fxMacroData.fetchPredictions(currencyKey, code));
    } catch (err: any) {
      logger.warn(
        { err: err.message },
        `Failed to fetch predictions for indicator '${code}' — forecast will stay null.`
      );
      predictionsByCode.set(code, []);
    }
  }

  return rawEvents.map((raw) => {
    const announcementId = `${currency.toLowerCase()}_${raw.release}_${raw.date}`;
    const announcement = announcementsByCode
      .get(raw.release)
      ?.find((a) => a.announcement_id === announcementId);
    const predictionGroup = predictionsByCode
      .get(raw.release)
      ?.find((p) => p.announcement_id === announcementId);
    return toCalendarEvent(raw, currency.toUpperCase(), announcement, predictionGroup);
  });
}

/**
 * W5 — Parse the indicator slug out of an FXMacroData `announcement_id`,
 * format `{currency}_{indicator}_{YYYY-MM-DD}`. The date is the
 * `_`-anchored trailing segment; the indicator is everything between the
 * currency prefix and the date (indicator slugs may themselves contain
 * underscores, e.g. `non_farm_payrolls`).
 */
const ANNOUNCEMENT_ID_RE = /_([^_]+)_(\d{4}-\d{2}-\d{2})$/;
function indicatorFromAnnouncementId(announcementId: string, currency: string): string | null {
  const prefix = `${currency.toLowerCase()}_`;
  if (!announcementId.startsWith(prefix)) return null;
  const m = ANNOUNCEMENT_ID_RE.exec(announcementId);
  return m ? m[1] : null;
}

/**
 * Per-indicator metadata sourced from the (live) current-year calendar, used
 * to enrich historical announcement rows that otherwise lack a friendly name /
 * importance / tier. FXMacroData's prior-year /v1/calendar is empty, so we
 * borrow these stable, indicator-level attributes from the current year.
 */
export interface CalendarEventMeta {
  name?: string | null;
  importance?: string | null;
  marketTier?: number | null;
  topTier?: boolean | null;
  source?: string | null;
  sourceUrl?: string | null;
}

/**
 * Build a CalendarEvent directly from an FXMacroData announcement. Used for
 * historical backfills where /v1/calendar returns nothing (it only serves
 * ~2 months lookback + forward) but /v1/announcements carries the full
 * historical time series (before/actual values). Indicator-level metadata
 * (friendly name, importance, tier) is passed via `meta` (sourced from the
 * current-year calendar) so historical rows are as readable as live ones;
 * fields the announcement cannot supply fall back to safe defaults.
 */
export function toCalendarEventFromAnnouncement(
  ann: FxMacroDataAnnouncement,
  predGroup: FxMacroDataPredictionGroup | undefined,
  currency: string,
  meta?: CalendarEventMeta
): CalendarEvent {
  const cur = currency.toLowerCase();
  const indicator = indicatorFromAnnouncementId(ann.announcement_id ?? '', cur) ?? '';
  const forecast = pickForecast(predGroup);
  return new CalendarEvent({
    id: `${cur}_${indicator}_${ann.date}`,
    currency,
    eventCode: indicator,
    eventName: meta?.name ?? indicator,
    referencePeriodDate: ann.date,
    announcementUnix: ann.announcement_datetime,
    announcementDatetimeUtc: ann.announcement_datetime
      ? new Date(ann.announcement_datetime * 1000).toISOString()
      : '',
    announcementDatetimeLocal: '',
    importance: (meta?.importance as CalendarEventImportance) ?? 'low',
    marketTier: meta?.marketTier ?? 0,
    isTopTier: meta?.topTier ?? false,
    sourceName: meta?.source ?? ann.source ?? null,
    sourceUrl: meta?.sourceUrl ?? ann.source_url ?? null,
    beforeValue: ann.previous_value ?? null,
    forecastValue: forecast.value,
    forecastType: forecast.type,
    actualValue: ann.val ?? null,
    hasOfficialForecast: ann.has_official_forecast
  });
}

/**
 * Turn a batch of historical announcements into CalendarEvents. Predictions are
 * fetched once per unique indicator (FXMacroData returns the whole prediction
 * series; we match by announcement_id), so cost stays at ~2 calls/indicator.
 */
export async function eventsFromAnnouncements(
  fxMacroData: FxMacroDataClient,
  announcements: FxMacroDataAnnouncement[],
  currency: string,
  logger: pino.Logger,
  metaByIndicator: Record<string, CalendarEventMeta> = {}
): Promise<CalendarEvent[]> {
  const cur = currency.toLowerCase();
  const byIndicator = new Map<string, FxMacroDataAnnouncement[]>();
  for (const ann of announcements) {
    const indicator = indicatorFromAnnouncementId(ann.announcement_id ?? '', cur);
    if (!indicator) continue;
    const bucket = byIndicator.get(indicator) ?? [];
    bucket.push(ann);
    byIndicator.set(indicator, bucket);
  }

  const events: CalendarEvent[] = [];
  for (const [indicator, anns] of byIndicator) {
    let predGroups: FxMacroDataPredictionGroup[] = [];
    try {
      predGroups = await fxMacroData.fetchPredictions(cur, indicator);
    } catch (err: any) {
      logger.warn(
        { err: err.message },
        `predictions failed for '${indicator}' — forecast will stay null.`
      );
    }
    const meta = metaByIndicator[indicator];
    for (const ann of anns) {
      const group = predGroups.find((p) => p.announcement_id === ann.announcement_id);
      events.push(toCalendarEventFromAnnouncement(ann, group, currency, meta));
    }
  }
  return events;
}

/**
 * Apply upstream `announcement` + `predictionGroup` onto an existing stored
 * `CalendarEvent`, returning a NEW event with merged values. Shared by the
 * SSE `handleStreamEvent` and the periodic `refreshRecentValuesInner` so
 * the merge rules (never downgrade to null, `pickForecast` priority, etc.)
 * stay in one place.
 */
export function mergeEventWithUpstream(
  existing: CalendarEvent,
  announcement: FxMacroDataAnnouncement | undefined,
  predictionGroup: FxMacroDataPredictionGroup | undefined
): CalendarEvent {
  const forecast = pickForecast(predictionGroup);
  return new CalendarEvent({
    id: existing.id,
    currency: existing.currency,
    eventCode: existing.eventCode,
    eventName: existing.eventName,
    referencePeriodDate: existing.referencePeriodDate,
    announcementUnix: existing.announcementUnix,
    announcementDatetimeUtc: existing.announcementDatetimeUtc,
    announcementDatetimeLocal: existing.announcementDatetimeLocal,
    importance: existing.importance,
    marketTier: existing.marketTier,
    isTopTier: existing.isTopTier,
    sourceName: existing.sourceName,
    sourceUrl: existing.sourceUrl,
    beforeValue: announcement ? announcement.previous_value : existing.beforeValue,
    forecastValue: forecast.value ?? existing.forecastValue,
    forecastType: forecast.type ?? existing.forecastType,
    actualValue: announcement ? announcement.val : existing.actualValue,
    hasOfficialForecast: announcement
      ? announcement.has_official_forecast
      : existing.hasOfficialForecast
  });
}
