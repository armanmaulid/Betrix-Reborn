import { env } from '@betrix/config';

export interface FxMacroDataCalendarEvent {
  release: string;
  name: string;
  date: string;
  announcement_datetime: number;
  announcement_datetime_utc: string;
  announcement_datetime_local: string;
  event_importance: 'low' | 'medium' | 'high';
  market_tier: number;
  top_tier_for_currency?: boolean;
  source?: string;
  source_url?: string;
}

export interface FxMacroDataAnnouncement {
  announcement_id: string;
  date: string;
  val: number | null;
  previous_value: number | null;
  announcement_datetime: number;
  has_official_forecast: boolean;
}

export type FxMacroDataPredictionType =
  | 'market_consensus'
  | 'market_prediction'
  | 'survey'
  | 'model_nowcast'
  | 'central_bank_forecast'
  | 'imf_weo'
  | 'fxmacrodata';

export interface FxMacroDataPrediction {
  predicted_value: number;
  prediction_type: FxMacroDataPredictionType;
  prediction_source_label?: string;
}

export interface FxMacroDataPredictionGroup {
  announcement_id: string;
  date: string;
  predictions: FxMacroDataPrediction[];
}

export interface FxMacroDataStreamEvent {
  announcement_id: string;
  currency: string;
  indicator: string;
  event_type: string;
  timestamp: number;
}

const RETRYABLE_STATUS = new Set([401, 429, 500, 502, 503, 504]);

/**
 * Client for FXMacroData (api.fxmacrodata.com) — the single external source
 * for economic calendar data. `fetchCalendar` returns the schedule only;
 * `fetchAnnouncements`/`fetchPredictions` supply the Before/Actual and
 * Forecast values respectively, joined by `announcement_id` (identical
 * format across all three endpoints). `subscribeEvents` opens the SSE
 * stream used as the real-time primary channel by CalendarWorker; the daily
 * sync in CalendarWorker is the safety net if this connection drops
 * unnoticed.
 *
 * FXMacroData's `/v1/calendar/{currency}` endpoint has been observed to
 * return a transient 401 with no change to the request (confirmed by manual
 * experiment: identical request, first attempt 401, second attempt 200) —
 * every fetch method here retries on that and other 5xx/429 statuses.
 */
export class FxMacroDataClient {
  constructor(
    private readonly baseUrl: string = env.FXMACRODATA_BASE_URL,
    private readonly apiKey: string = env.FXMACRODATA_API_KEY,
    private readonly maxRetryAttempts: number = env.FXMACRODATA_RETRY_MAX_ATTEMPTS,
    private readonly retryBaseDelayMs: number = env.FXMACRODATA_RETRY_BASE_DELAY_MS,
    private readonly sseReconnectDelayMs: number = env.FXMACRODATA_SSE_RECONNECT_DELAY_MS
  ) {}

  private headers(): Record<string, string> {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }

  private async fetchWithRetry<T>(path: string): Promise<T> {
    let lastError: Error = new Error(`FXMacroData request failed: ${path}`);

    for (let attempt = 0; attempt <= this.maxRetryAttempts; attempt++) {
      try {
        const resp = await fetch(`${this.baseUrl}${path}`, { headers: this.headers() });

        if (resp.ok) {
          return (await resp.json()) as T;
        }

        if (!RETRYABLE_STATUS.has(resp.status) || attempt === this.maxRetryAttempts) {
          throw new Error(`FXMacroData ${path} returned non-retryable status ${resp.status}`);
        }

        lastError = new Error(`FXMacroData ${path} returned ${resp.status}, retrying...`);
      } catch (err: any) {
        lastError = err;
        if (attempt === this.maxRetryAttempts) throw lastError;
      }

      const delay = this.retryBaseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw lastError;
  }

  /** GET /v1/calendar/{currency} — the event schedule, no Before/Forecast/Actual values. */
  public async fetchCalendar(currency: string): Promise<FxMacroDataCalendarEvent[]> {
    const result = await this.fetchWithRetry<{ data: FxMacroDataCalendarEvent[] }>(
      `/v1/calendar/${currency}`
    );
    return result.data ?? [];
  }

  /** GET /v1/announcements/{currency}/{indicator} — historical Before/Actual values. */
  public async fetchAnnouncements(
    currency: string,
    indicator: string,
    startDate?: string,
    endDate?: string
  ): Promise<FxMacroDataAnnouncement[]> {
    const qs = new URLSearchParams();
    if (startDate) qs.set('start_date', startDate);
    if (endDate) qs.set('end_date', endDate);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const result = await this.fetchWithRetry<{ data: FxMacroDataAnnouncement[] }>(
      `/v1/announcements/${currency}/${indicator}${suffix}`
    );
    return result.data ?? [];
  }

  /**
   * GET /v1/predictions/{currency}/{indicator} — Forecast values, grouped by
   * announcement_id. Not every indicator has a value for every
   * prediction_type; callers apply the priority rule (market_consensus first,
   * fxmacrodata as fallback) — this client returns the raw groups unfiltered.
   */
  public async fetchPredictions(
    currency: string,
    indicator: string,
    predictionType?: FxMacroDataPredictionType
  ): Promise<FxMacroDataPredictionGroup[]> {
    const suffix = predictionType ? `?prediction_type=${predictionType}` : '';
    const result = await this.fetchWithRetry<{ data: FxMacroDataPredictionGroup[] }>(
      `/v1/predictions/${currency}/${indicator}${suffix}`
    );
    return result.data ?? [];
  }

  /**
   * GET /v1/stream/events (SSE) — real-time event delivery. Returns an
   * unsubscribe function. Auto-reconnects on connection loss with
   * `sseReconnectDelayMs` delay unless `unsubscribe()` was called
   * (mirrors the exponential-ish backoff pattern in ws-worker.ts's
   * scheduleReconnect, but at a fixed delay since FXMacroData's stream
   * does not document a backoff requirement).
   */
  public subscribeEvents(
    onEvent: (event: FxMacroDataStreamEvent) => void,
    onError: (err: Error) => void
  ): () => void {
    let stopped = false;
    let abortController: AbortController | null = null;

    const connect = async () => {
      if (stopped) return;
      abortController = new AbortController();

      try {
        const resp = await fetch(`${this.baseUrl}/v1/stream/events`, {
          headers: { ...this.headers(), Accept: 'text/event-stream' },
          signal: abortController.signal
        });

        if (!resp.ok || !resp.body) {
          throw new Error(`FXMacroData SSE stream returned status ${resp.status}`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const rawEvent of events) {
            const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data:'));
            if (!dataLine) continue;
            try {
              const parsed: FxMacroDataStreamEvent = JSON.parse(
                dataLine.slice('data:'.length).trim()
              );
              onEvent(parsed);
            } catch {
              // Malformed SSE payload — skip this event, keep the connection alive.
            }
          }
        }

        if (!stopped) scheduleReconnect();
      } catch (err: any) {
        if (!stopped) {
          onError(err);
          scheduleReconnect();
        }
      }
    };

    const scheduleReconnect = () => {
      if (stopped) return;
      setTimeout(() => {
        if (!stopped) connect();
      }, this.sseReconnectDelayMs);
    };

    void connect();

    return () => {
      stopped = true;
      abortController?.abort();
    };
  }
}
