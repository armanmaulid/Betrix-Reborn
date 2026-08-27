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
  /** Present on the API response (AnnouncementDataPoint) but optional. */
  source?: string;
  source_url?: string;
}

export type FxMacroDataPredictionType =
  | 'market_consensus'
  | 'market_prediction'
  | 'survey'
  | 'model_nowcast'
  | 'central_bank_forecast'
  | 'central_bank_projection'
  | 'imf_weo'
  | 'oecd_eo'
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

// ── Data catalogue ────────────────────────────────────────────────────────
// `GET /v1/data_catalogue/{currency}` returns the full set of indicators
// available for a currency (name, unit, frequency, has_official_forecast).
// The calendar endpoint only exposes the subset that is scheduled; the
// catalogue is the authoritative list to backfill from.
export interface FxMacroDataCatalogueEntry {
  indicator: string;
  name?: string;
  unit?: string;
  frequency?: string;
  has_official_forecast?: boolean;
}
export interface FxMacroDataCatalogueResponse {
  currency: string;
  indicators: FxMacroDataCatalogueEntry[];
}

// ── FX spot prices ────────────────────────────────────────────────────────
// `GET /v1/forex/{base}/{quote}` — daily OHLC + optional technical overlays.
export type FxTechnicalIndicator =
  | 'sma_20'
  | 'sma_50'
  | 'sma_200'
  | 'rsi_14'
  | 'macd'
  | 'ema_12'
  | 'ema_26'
  | 'bollinger_bands'
  | 'all';
export interface FxMacroDataFxPriceRow {
  date: string; // YYYY-MM-DD
  open?: number;
  high?: number;
  low?: number;
  close: number;
  // Technical overlays (only present when ?indicators= is passed).
  sma_20?: number;
  sma_50?: number;
  sma_200?: number;
  rsi_14?: number;
  macd?: number;
  macd_signal?: number;
  macd_hist?: number;
  ema_12?: number;
  ema_26?: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
}
export interface FxMacroDataFxPriceResponse {
  base: string;
  quote: string;
  rows: FxMacroDataFxPriceRow[];
}

// ── COT positioning ───────────────────────────────────────────────────────
// `GET /v1/cot/{currency}` — CFTC Commitment of Traders.
export interface FxMacroDataCotRow {
  date: string; // YYYY-MM-DD
  // Standard COT fields (subset — schema is large; we keep what trading UI needs).
  commercial_long?: number;
  commercial_short?: number;
  commercial_net?: number;
  noncommercial_long?: number;
  noncommercial_short?: number;
  noncommercial_net?: number;
  total_open_interest?: number;
}
export interface FxMacroDataCotResponse {
  currency: string;
  rows: FxMacroDataCotRow[];
}

// ── Commodities ──────────────────────────────────────────────────────────
// `GET /v1/commodities/{indicator}` — gold | silver | platinum history.
export type FxCommodityIndicator = 'gold' | 'silver' | 'platinum';
export interface FxMacroDataCommodityRow {
  date: string; // YYYY-MM-DD
  close: number;
  open?: number;
  high?: number;
  low?: number;
  unit?: string; // e.g. USD/oz
}
export interface FxMacroDataCommodityResponse {
  indicator: FxCommodityIndicator;
  rows: FxMacroDataCommodityRow[];
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
        // Per-attempt hard timeout — retries with backoff are useless against
        // a hung TCP connection without one.
        const resp = await fetch(`${this.baseUrl}${path}`, {
          headers: this.headers(),
          signal: AbortSignal.timeout(10_000)
        });

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

  /** GET /v1/calendar/{currency} — the event schedule, no Before/Forecast/Actual values.
   *  FXMacroData returns ONLY upcoming releases unless `start_date`/`end_date`
   *  are supplied, so historical (past-year) schedules require the range. */
  public async fetchCalendar(
    currency: string,
    startDate?: string,
    endDate?: string
  ): Promise<FxMacroDataCalendarEvent[]> {
    const qs = new URLSearchParams();
    if (startDate) qs.set('start_date', startDate);
    if (endDate) qs.set('end_date', endDate);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const result = await this.fetchWithRetry<{ data: FxMacroDataCalendarEvent[] }>(
      `/v1/calendar/${currency}${suffix}`
    );
    return result.data ?? [];
  }

  /** GET /v1/announcements/{currency}/{indicator} — historical Before/Actual values.
   *  Premium endpoint — full history (incl. >365d USD) requires an API key.
   *  Without one, returns [] so the calendar/refresh pass is a no-op and
   *  the trial period is a hard gate. */
  public async fetchAnnouncements(
    currency: string,
    indicator: string,
    startDate?: string,
    endDate?: string
  ): Promise<FxMacroDataAnnouncement[]> {
    if (!this.hasApiKey()) return [];
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
   * Premium endpoint — no API key → returns [].
   */
  public async fetchPredictions(
    currency: string,
    indicator: string,
    predictionType?: FxMacroDataPredictionType
  ): Promise<FxMacroDataPredictionGroup[]> {
    if (!this.hasApiKey()) return [];
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
    // Premium endpoint — no API key → surface the error once and return a
    // no-op unsubscribe. Prevents the worker from burning a 401/connect-error
    // loop and ensures SSE is purely trial/paid gated.
    if (!this.hasApiKey()) {
      onError(
        new Error(
          'FXMacroData SSE stream requires FXMACRODATA_API_KEY (premium/paid). Subscribe is a no-op without a key.'
        )
      );
      return () => {
        /* no-op */
      };
    }
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

  /**
   * True iff the client was constructed with a non-empty API key. Premium
   * endpoints (data_catalogue, forex, cot, commodities) require a paid
   * Professional key — they short-circuit to `[]` when absent, so the
   * 14-day trial is a hard gate and there's no accidental API burn when the
   * key is empty/expired.
   */
  public hasApiKey(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /** GET /v1/data_catalogue/{currency} — full list of indicators available
   *  for the currency (name/unit/frequency/official-forecast flag). Used to
   *  discover every indicator worth backfilling, even those not yet
   *  scheduled in the calendar. Premium endpoint — no API key → returns []. */
  public async fetchDataCatalogue(
    currency: string
  ): Promise<FxMacroDataCatalogueEntry[]> {
    if (!this.hasApiKey()) return [];
    const result = await this.fetchWithRetry<FxMacroDataCatalogueResponse>(
      `/v1/data_catalogue/${currency}`
    );
    return result.indicators ?? [];
  }

  /** GET /v1/forex/{base}/{quote} — daily FX spot OHLC + optional technical
   *  indicators. Premium endpoint — no API key → returns []. */
  public async fetchFxPrice(
    base: string,
    quote: string,
    startDate?: string,
    endDate?: string,
    indicators?: FxTechnicalIndicator[]
  ): Promise<FxMacroDataFxPriceRow[]> {
    if (!this.hasApiKey()) return [];
    const qs = new URLSearchParams();
    if (startDate) qs.set('start_date', startDate);
    if (endDate) qs.set('end_date', endDate);
    if (indicators && indicators.length > 0) qs.set('indicators', indicators.join(','));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const result = await this.fetchWithRetry<FxMacroDataFxPriceResponse>(
      `/v1/forex/${base}/${quote}${suffix}`
    );
    return result.rows ?? [];
  }

  /** GET /v1/cot/{currency} — CFTC Commitment of Traders positioning.
   *  Premium endpoint — no API key → returns []. */
  public async fetchCOT(
    currency: string,
    startDate?: string,
    endDate?: string
  ): Promise<FxMacroDataCotRow[]> {
    if (!this.hasApiKey()) return [];
    const qs = new URLSearchParams();
    if (startDate) qs.set('start_date', startDate);
    if (endDate) qs.set('end_date', endDate);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const result = await this.fetchWithRetry<FxMacroDataCotResponse>(
      `/v1/cot/${currency}${suffix}`
    );
    return result.rows ?? [];
  }

  /** GET /v1/commodities/{indicator} — gold | silver | platinum history.
   *  Premium endpoint — no API key → returns []. */
  public async fetchCommodities(
    indicator: FxCommodityIndicator,
    startDate?: string,
    endDate?: string
  ): Promise<FxMacroDataCommodityRow[]> {
    if (!this.hasApiKey()) return [];
    const qs = new URLSearchParams();
    if (startDate) qs.set('start_date', startDate);
    if (endDate) qs.set('end_date', endDate);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const result = await this.fetchWithRetry<FxMacroDataCommodityResponse>(
      `/v1/commodities/${indicator}${suffix}`
    );
    return result.rows ?? [];
  }
}
