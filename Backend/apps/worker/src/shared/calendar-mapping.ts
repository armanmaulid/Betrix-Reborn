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

function utcDayKey(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

/**
 * Day-level idempotence for the seeder: drop upstream events whose UTC day
 * already has ANY stored row. raw.date is upstream's "YYYY-MM-DD" (UTC day),
 * which is exactly the bucket key used on the database side.
 */
export function filterEventsMissingDays(
  rawEvents: FxMacroDataCalendarEvent[],
  existingUnixSeconds: number[]
): FxMacroDataCalendarEvent[] {
  const coveredDays = new Set(existingUnixSeconds.map(utcDayKey));
  return rawEvents.filter((raw) => {
    if (!raw.date) return false; // unplaceable without a date — skip defensively
    return !coveredDays.has(raw.date);
  });
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
