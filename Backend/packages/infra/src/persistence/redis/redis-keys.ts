/**
 * T2.1 — SINGLE SOURCE OF TRUTH for every Redis key & pub/sub channel
 * (DB/Redis Plan §B Hukum #4).
 *
 * Namespace convention:  b:{env}:{domain}:{subresource}[:{id}]
 * The env prefix lets dev/staging share an instance without collisions.
 *
 * Rules enforced elsewhere:
 *  - Call-sites MUST NOT hard-code key literals (ESLint ban + guard script).
 *  - Every SET carries a TTL except `ops:*history` and `idem:*`.
 *  - Tier mapping: R0 cache-volatile · R1 auth-gate · R2 coordination.
 */
const ENV = process.env.NODE_ENV || 'development';

export const redisKeys = {
  // ── R0 CACHE-VOLATILE ────────────────────────────────────────────────
  marketPricesAll: () => `b:${ENV}:market:prices:all`,
  marketOhlc: (symbol: string, tf: string) =>
    `b:${ENV}:market:ohlc:${symbol.toUpperCase()}:${tf.toLowerCase()}`,
  cacheNewsPage1: () => `b:${ENV}:cache:news:page1`,
  cacheCalendarVersion: () => `b:${ENV}:cache:calendar:ver`,
  opsMarker: (name: string) => `b:${ENV}:ops:marker:${name}`,
  cacheCalendarMonth: (currency: string, yearMonth: string) =>
    `b:${ENV}:cache:calendar:${currency.toUpperCase()}:${yearMonth}`,
  cacheSymbols: () => `b:${ENV}:cache:symbols`,
  opsGauges: () => `b:${ENV}:ops:gauges`,
  opsAnalyticsCache: () => `b:${ENV}:ops:analytics`,
  opsLock: (name: string) => `b:${ENV}:ops:lock:${name}`,

  // ── R1 AUTH-GATE (TTL wajib) ─────────────────────────────────────────
  captcha: (challengeId: string) => `b:${ENV}:auth:captcha:${challengeId}`,
  /** Dual-read window helper — remove one release after the ns cutover. */
  captchaLegacy: (challengeId: string) => `auth:captcha:${challengeId}`,
  streamTicket: (ticket: string) => `b:${ENV}:auth:ticket:${ticket}`,
  /** Dual-read window helper. */
  streamTicketLegacy: (ticket: string) => `auth:stream_ticket:${ticket}`,
  rateLimit: (scope: string, id: string) => `b:${ENV}:rl:${scope}:${id}`,
  idempotency: (scope: string, key: string) => `b:${ENV}:idem:${scope}:${key}`,
  sessionDigest: (hash: string) => `b:${ENV}:auth:sessdigest:${hash}`,

  // ── R2 COORDINATION ──────────────────────────────────────────────────
  newsSeen: () => `b:${ENV}:news:seen`,
  workerCommandChannel: (workerId: string) => `b:${ENV}:wcmd:${workerId}`,
  workerReportChannel: (workerId: string) => `b:${ENV}:wrep:${workerId}`,
  workerLease: (workerId: string) => `b:${ENV}:wlock:${workerId}`,
  /** T3.3 — live telemetry heartbeat written by workers, read by /workers. */
  workerHeartbeat: (workerId: string) => `b:${ENV}:wstate:${workerId}`
};
