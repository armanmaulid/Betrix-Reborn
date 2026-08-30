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
  /** Daily reference rate — always present (the canonical close). */
  val?: number;
  // OHLC built from timestamped reference observations — omitted on rows
  // without ≥4 observations, so close may be null where val is not.
  open?: number;
  high?: number;
  low?: number;
  close?: number | null;
  // Technical overlays (only present when ?indicators= is passed).
  sma_20?: number;
  sma_50?: number;
  sma_200?: number;
  rsi_14?: number;
  macd?: number;
  macd_signal?: number;
  macd_histogram?: number;
  ema_12?: number;
  ema_26?: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
}
export interface FxMacroDataFxPriceResponse {
  base: string;
  quote: string;
  pagination?: FxPaginationInfo;
  data: FxMacroDataFxPriceRow[];
}

/** Shared pagination envelope returned by forex/cot/commodities endpoints. */
export interface FxPaginationInfo {
  limit?: number | null;
  offset?: number;
  returned_count?: number;
  total_count?: number;
  has_more?: boolean;
  next_offset?: number | null;
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
  /** API field name is `open_interest` (not `total_open_interest`). */
  open_interest?: number;
}
export interface FxMacroDataCotResponse {
  currency: string;
  pagination?: FxPaginationInfo;
  data: FxMacroDataCotRow[];
}

// ── Commodities ──────────────────────────────────────────────────────────
// `GET /v1/commodities/{indicator}` — gold | silver | platinum history.
export type FxCommodityIndicator = 'gold' | 'silver' | 'platinum';
export interface FxMacroDataCommodityRow {
  date: string; // YYYY-MM-DD
  /** API field name is `val` (not `close`); there is no OHLC or unit on this endpoint. */
  val?: number;
  pct_change?: number;
  pct_change_12m?: number;
}
export interface FxMacroDataCommodityResponse {
  indicator: string;
  pagination?: FxPaginationInfo;
  data: FxMacroDataCommodityRow[];
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

  /**
   * FXMacroData authenticates via a query parameter (`?api_key=...`), not an
   * Authorization header — confirmed against the vendor's own quickstart
   * (`curl ".../policy_rate?api_key=YOUR_API_KEY"`). Sending `Authorization:
   * Bearer` (the previous implementation) is simply ignored by the server:
   * free USD calls still succeed with no key at all, which is why this went
   * unnoticed — but anything that actually requires the key (SSE stream,
   * non-USD premium endpoints) 401s every time. Centralized here (via
   * `withApiKey`) rather than in each of the 7 fetch* methods, so no caller
   * can forget it and no caller can double-apply it.
   */
  private withApiKey(url: URL): URL {
    if (this.apiKey) url.searchParams.set('api_key', this.apiKey);
    return url;
  }

  private async fetchWithRetry<T>(path: string): Promise<T> {
    let lastError: Error = new Error(`FXMacroData request failed: ${path}`);
    const url = this.withApiKey(new URL(path, this.baseUrl));

    for (let attempt = 0; attempt <= this.maxRetryAttempts; attempt++) {
      try {
        // Per-attempt hard timeout — retries with backoff are useless against
        // a hung TCP connection without one.
        const resp = await fetch(url, {
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

  /**
   * Page through a paginated list endpoint until `pagination.has_more` is
   * false, returning every row. The forex/cot/commodities endpoints default to
   * `limit=20` and cap at `limit=100` — without paging here, a 6-year backfill
   * silently returns only ~20 rows per call (≈120 rows/pair) instead of the
   * full series. `pathWithQuery(offset)` must produce the path + query string
   * (api_key is appended by `fetchWithRetry`); `parse` extracts rows + the
   * pagination envelope from the decoded JSON.
   */
  private async fetchPaginated<T>(
    pathWithQuery: (offset: number) => string,
    parse: (json: any) => { rows: T[]; pagination?: FxPaginationInfo }
  ): Promise<T[]> {
    const LIMIT = 100; // API hard maximum (defaults to 20 when omitted)
    const out: T[] = [];
    let offset = 0;
    // Hard cap 200 pages (20k rows) guards against a server that never clears has_more.
    for (let page = 0; page < 200; page++) {
      const json = await this.fetchWithRetry<any>(pathWithQuery(offset));
      const { rows, pagination } = parse(json);
      out.push(...rows);
      if (!pagination?.has_more || rows.length === 0) break;
      // `next_offset` is nullable per the schema — fall back to a computed
      // offset when the server sets has_more but omits it.
      offset = pagination.next_offset ?? offset + rows.length;
    }
    return out;
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
   *  Available on the FREE tier for USD (clamped to the most recent 365 days;
   *  older `start_date` is silently clamped server-side per the spec). Other
   *  currencies require a paid key. Anonymous callers hit the 365-day window;
   *  callers with a key get the full history. The client does NOT gate on
   *  key presence — it forwards the request either way and the server decides. */
  public async fetchAnnouncements(
    currency: string,
    indicator: string,
    startDate?: string,
    endDate?: string
  ): Promise<FxMacroDataAnnouncement[]> {
    // No-date callers (CalendarWorker's daily value refresh) only need the
    // most-recent rows, which the default limit=20 covers. Paginating the full
    // history there would burn up to ~70 pages on daily indicators (e.g.
    // policy_rate). Historical callers (calendar backfill) always pass a
    // range, and those need every row — the API defaults limit=20, so without
    // paging a full-year window silently drops all but the 20 most recent.
    if (!(startDate && endDate)) {
      const qs = new URLSearchParams();
      if (startDate) qs.set('start_date', startDate);
      if (endDate) qs.set('end_date', endDate);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const result = await this.fetchWithRetry<{ data: FxMacroDataAnnouncement[] }>(
        `/v1/announcements/${currency}/${indicator}${suffix}`
      );
      return result.data ?? [];
    }
    return this.fetchPaginated<FxMacroDataAnnouncement>(
      (offset) => {
        const qs = new URLSearchParams();
        qs.set('start_date', startDate);
        qs.set('end_date', endDate);
        qs.set('limit', '100');
        qs.set('offset', String(offset));
        return `/v1/announcements/${currency}/${indicator}?${qs.toString()}`;
      },
      (json) => ({ rows: json?.data ?? [], pagination: json?.pagination })
    );
  }

  /**
   * GET /v1/predictions/{currency}/{indicator} — Forecast values, grouped by
   * announcement_id. Not every indicator has a value for every
   * prediction_type; callers apply the priority rule (market_consensus first,
   * fxmacrodata as fallback) — this client returns the raw groups unfiltered.
   * Free for USD (subject to the same 365-day window as announcements); not
   * gated client-side.
   */
  public async fetchPredictions(
    currency: string,
    indicator: string,
    predictionType?: FxMacroDataPredictionType,
    startDate?: string,
    endDate?: string,
    preReleaseOnly = false
  ): Promise<FxMacroDataPredictionGroup[]> {
    // Default pre_release_only=false: the store only persists pre-release rows,
    // but the flag also controls whether *past* (already-released) groups are
    // included in the default window. With the default (true) only the ~future
    // window is served, so historical forecast joins would come back empty.
    const qs = new URLSearchParams();
    if (predictionType) qs.set('prediction_type', predictionType);
    if (startDate) qs.set('start_date', startDate);
    if (endDate) qs.set('end_date', endDate);
    qs.set('pre_release_only', String(preReleaseOnly));
    // Predictions are sparse (one group per release per indicator), so the
    // 20-row default is ample; 100 keeps a dense daily indicator whole.
    qs.set('limit', '100');
    const result = await this.fetchWithRetry<{ data: FxMacroDataPredictionGroup[] }>(
      `/v1/predictions/${currency}/${indicator}?${qs.toString()}`
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
        const streamUrl = this.withApiKey(new URL('/v1/stream/events', this.baseUrl));
        const resp = await fetch(streamUrl, {
          headers: { Accept: 'text/event-stream' },
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
   *  scheduled in the calendar.
   *
   *  Free for USD (all USD indicators are publicly accessible per README);
   *  other currencies require a paid key — the server enforces that and
   *  returns 4xx, which the caller's fetchWithRetry will surface. The
   *  client intentionally does NOT gate this so free USD catalogue
   *  discovery keeps working. */
  public async fetchDataCatalogue(currency: string): Promise<FxMacroDataCatalogueEntry[]> {
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
    return this.fetchPaginated<FxMacroDataFxPriceRow>(
      (offset) => {
        const qs = new URLSearchParams();
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        if (indicators && indicators.length > 0) qs.set('indicators', indicators.join(','));
        qs.set('limit', '100');
        qs.set('offset', String(offset));
        return `/v1/forex/${base}/${quote}?${qs.toString()}`;
      },
      (json) => ({ rows: json?.data ?? [], pagination: json?.pagination })
    );
  }

  /** GET /v1/cot/{currency} — CFTC Commitment of Traders positioning.
   *  Premium endpoint — no API key → returns []. */
  public async fetchCOT(
    currency: string,
    startDate?: string,
    endDate?: string
  ): Promise<FxMacroDataCotRow[]> {
    if (!this.hasApiKey()) return [];
    return this.fetchPaginated<FxMacroDataCotRow>(
      (offset) => {
        const qs = new URLSearchParams();
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        qs.set('limit', '100');
        qs.set('offset', String(offset));
        return `/v1/cot/${currency}?${qs.toString()}`;
      },
      (json) => ({ rows: json?.data ?? [], pagination: json?.pagination })
    );
  }

  /** GET /v1/commodities/{indicator} — gold | silver | platinum history.
   *  Premium endpoint — no API key → returns []. */
  public async fetchCommodities(
    indicator: FxCommodityIndicator,
    startDate?: string,
    endDate?: string
  ): Promise<FxMacroDataCommodityRow[]> {
    if (!this.hasApiKey()) return [];
    return this.fetchPaginated<FxMacroDataCommodityRow>(
      (offset) => {
        const qs = new URLSearchParams();
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        qs.set('limit', '100');
        qs.set('offset', String(offset));
        return `/v1/commodities/${indicator}?${qs.toString()}`;
      },
      (json) => ({ rows: json?.data ?? [], pagination: json?.pagination })
    );
  }
}
