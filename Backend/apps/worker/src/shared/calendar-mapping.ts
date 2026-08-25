import pino from 'pino';
import { CalendarEvent } from '@betrix/domain';
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
const FORECAST_TYPE_PRIORITY: FxMacroDataPredictionGroup['predictions'][number]['prediction_type'][] =
  ['market_consensus', 'fxmacrodata'];

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
    importance: raw.event_importance,
    marketTier: raw.market_tier,
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
  const uniqueEventCodes = [...new Set(rawEvents.map((e) => e.release))];
  const announcementsByCode = new Map<string, FxMacroDataAnnouncement[]>();
  const predictionsByCode = new Map<string, FxMacroDataPredictionGroup[]>();

  for (const code of uniqueEventCodes) {
    try {
      announcementsByCode.set(code, await fxMacroData.fetchAnnouncements(currency, code));
    } catch (err: any) {
      logger.warn(
        { err: err.message },
        `Failed to fetch announcements for indicator '${code}' — before/actual will stay null.`
      );
      announcementsByCode.set(code, []);
    }
    try {
      predictionsByCode.set(code, await fxMacroData.fetchPredictions(currency, code));
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
