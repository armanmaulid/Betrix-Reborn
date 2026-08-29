# Backend Review — Native vs Complex Logic (5-Agent Findings)

**Date:** 2026-08-29
**Scope:** `Backend/` monorepo (Fastify + Drizzle + Pino + TypeBox + node-cron + @upstash/redis + ws + dukascopy-node)
**Review method:** 5 parallel review agents, each scoped to one layer
**Goal:** Find "re-invented wheels" — complex custom logic that duplicates Node stdlib, TypeScript features, or libraries already in the project.

---

## 1. Verdict (TL;DR)

The backend is **NOT** broadly reinventing libraries. Validation (`TypeBox`), JWT (`@fastify/jwt`), CORS/helmet/rate-limit (`@fastify/*`), tokens (`node:crypto`), scheduling (`node-cron`), and ORM (Drizzle) are already used correctly. The "kusut" is concentrated in **four hotspots**:

1. **SSE layer (`apps/api/src/plugins/sse.plugin.ts`)** — writes directly to the raw socket; the only finding with real *correctness* consequences (dropped CORS/helmet headers, healthy clients disconnected by a backpressure misread, colliding client IDs, a per-process "global" budget that does not survive replicas or month boundaries).
2. **No `response` schema / serialization layer** — 76 hand-written `{success,data}` envelopes; the only thing protecting `passwordHash` is developers remembering `.toJSON()`.
3. **Error & log plumbing duplicated** across `errorHandler.plugin.ts`, `rateLimit.plugin.ts`, in-handler `catch {}` blocks, and a `LogController` that is instantiated but its methods are never overridden.
4. **`container.plugin.ts` — a 795-line hand-rolled DI framework** on top of Fastify's decorator/encapsulation system (which *is* the native DI container).

**Estimated removable complexity:** ~1.100–1.500 lines, **without adding a single new dependency**.

---

## 2. Already Fixed — Quick Wins (commit `b5180aa`)

These were executed and committed before this doc was written. Line numbers below reflect the committed state.

| # | Finding | File:line (after fix) |
|---|---------|------------------------|
| Q1 | `new Promise(setTimeout)` → `node:timers/promises` `setTimeout` | `packages/application/src/use-cases/identity/LoginUseCase.ts:17,77`; `packages/core/src/utils/index.ts:3,50`; `packages/infra/src/external/fxmacrodata/FxMacroDataClient.ts:2,219` (aliased `sleep`); `apps/worker/src/main.ts:2,44`; `apps/worker/src/shared/ManagedWorkerBase.ts:3,82`; `apps/worker/src/sync-worker.ts:3,256` |
| Q2 | `AbortController`+`setTimeout` → `AbortSignal.any([ext, AbortSignal.timeout(ms)])` | `packages/infra/src/external/ai/AiGatewayClient.ts:63-66,85` |
| Q3 | Removed redundant manual `JSON` (de)serialization around `@upstash/redis` (auto-serializes) | `packages/infra/src/persistence/redis/RedisMarketDataRepository.ts:43,62,77,114,123`; `packages/infra/src/messaging/RedisWorkerCommandBus.ts:50,62,78`; `packages/infra/src/persistence/pg/DrizzleNewsRepository.ts:147,198`; `DrizzleSymbolRepository.ts:45,54`; `DrizzleCalendarRepository.ts:113,122`; `DrizzleAdminRepositories.ts:265,293,307,316` |
| Q4 | `toISOString().slice(0,10)` → `Intl.DateTimeFormat('en-CA',{timeZone:'UTC'})` | `apps/worker/src/sync-worker.ts:21,225,243`; `apps/worker/src/calendar-worker.ts:17,238` |
| Q5 | `Date.now()` SSE client IDs → `randomUUID()` (fixes same-ms collision) | `apps/api/src/routes/api/v1/stream.routes.ts:5,37,66`; `apps/api/src/routes/api/v1/admin.routes.ts:5,84` |
| Q6 | `console.warn` → shared `pino` logger / `fastify.log` | New `packages/application/src/logger.ts`; `ContextInjectionService.ts:5,64,88`; `ResendVerificationUseCase.ts`, `ForgotPasswordUseCase.ts`, `RegisterUseCase.ts`; `apps/api/src/plugins/sse.plugin.ts:1-6,38,302` (uses `fastify.log.child({plugin:'sse'})`) |
| Q7 | Fragile regex `onRoute` rate-limit → per-route `config.rateLimit` | `apps/api/src/plugins/rateLimit.plugin.ts:96` (regex hook removed); `apps/api/src/routes/api/v1/auth.routes.ts:40,76,175,195,215` |

> Validation: `tsc` build (7 projects) PASS, `eslint` 0 errors, `prettier` clean, `vitest` domain 44 + application 28 pass. Infra 5 tests fail only on `ECONNREFUSED` (no Postgres/Redis in sandbox) — see §7.

---

## 2b. Implementation Status Tracker (Done / In Progress / Not Executed)

> Updated: 2026-08-29. Use this as the single source of truth for what is fixed.
> Legend: ✅ Done · 🔄 In Progress · ⬜ Not executed · 🔒 Keep (legit, no change needed)
> Waves: **W1** security+correctness · **W2** dedup (0 new deps) · **W3** structural/cleanup

| Finding | Area | Status |
|---------|------|--------|
| Q1–Q7 | all layers | ✅ Done (commit `b5180aa`) |
| P4 (api pino) | api | ✅ Done (Q6) |
| P5 (api clientId) | api | ✅ Done (Q5) |
| P22 (api onRoute) | api | ✅ Done (Q7) |
| I5 (infra stale) | infra | ✅ Done (Q3) |
| W8 (worker date key) | worker | ✅ Done (Q4) |
| P6 (response schema) | api | ⬜ Not executed — **W1 (recommended next, high leverage + security)** |
| P1 (SSE raw socket) | api | ⬜ Not executed — **W1 (correctness)** |
| P3 (backpressure) | api | ⬜ Not executed — **W1 (correctness)** |
| P13 (budget SM) | api | ⬜ Not executed — **W1** |
| P9 (catch→404) | api | ⬜ Not executed — **W1** |
| P10 (LogController) | api | ⬜ Not executed — **W1** |
| P2 (SSE frame dup) | api | ⬜ Not executed — W1 |
| A1 (Value.Decode) | app | ⬜ Not executed — W2 (high) |
| A2 (UUID regex) | app | ⬜ Not executed — W2 |
| A5 (switch→table) | app | ⬜ Not executed — W2 |
| I1 (SSE parser dup) | infra | ⬜ Not executed — W2 |
| I3 (process.env) | infra | ⬜ Not executed — W2 |
| W3 (backfillers) | worker | ⬜ Not executed — W2 (high) |
| W4 (env parsers) | worker | ⬜ Not executed — W2 |
| P7 (query defaults) | api | ⬜ Not executed — W2 |
| P8 (error handler) | api | ⬜ Not executed — W2 |
| P11 (rate-limit store) | api | ⬜ Not executed — W2 (brute-force) |
| P12 (CORS) | api | ⬜ Not executed — W2 |
| P14 (2nd redis) | api | ⬜ Not executed — W2 |
| P17 (any types) | api | ⬜ Not executed — W2 |
| P18 (authUser cast) | api | ⬜ Not executed — W2 |
| P19 (jwt bound) | api | ⬜ Not executed — W2 |
| P20 (health) | api | ⬜ Not executed — W2 |
| P21 (signals) | api | ⬜ Not executed — W2 |
| C1 (config defaults) | config | ⬜ Not executed — W3 |
| C2 (config Number bug) | config | ⬜ Not executed — W3 |
| A3 (temperature) | app | ⬜ Not executed — W3 |
| A4 (CSV) | app | ⬜ Not executed — W3 |
| A6 (credit retry) | app | ⬜ Not executed — W3 (or keep) |
| I4 (legacy scaffolding) | infra | ⬜ Not executed — W3 |
| W1 (retry helper) | worker | ⬜ Not executed — W3 |
| W2 (month math) | worker | ⬜ Not executed — W3 |
| W5 (indicator parse) | worker | ⬜ Not executed — W3 |
| W6 (backoff) | worker | ⬜ Not executed — W3 |
| W7 (daily budget) | worker | ⬜ Not executed — W3 |
| P15 (DI container) | api | ⬜ Not executed — W3 (structural) |
| P16 (bg loops) | api | ⬜ Not executed — W3 |
| I2 (fetch retry) | infra | 🔒 Keep (no stdlib equivalent) |
| W9 (ManagedWorkerBase) | worker | 🔒 Keep (distributed leader election, no replacement) |

> Current "In Progress": **none** (all pending items are unstarted).

---

## 3. `packages/core` + `packages/config`

| ID | File:line | Issue | Native / stdlib fix | Effort | Risk |
|----|-----------|-------|---------------------|--------|------|
| C1 | `packages/config/src/index.ts:25-35` (schema `default`) vs `:69-87` (`resolvedEnv`) vs `:99-173` (`env`) | Env defaults declared in schema are **never applied** — repeated 3× by hand. | `Value.Default(EnvSchema, process.env)` then `Value.Parse` (TypeBox already a dep). | Med | Med |
| C2 | `packages/config/src/index.ts:71,82,103,130,154` etc. `Number(process.env.X) || default` | Latent bug: `0` is a valid value (`PORT=0`, `RATE_LIMIT_MAX=0`) but collapses to default. | `Value.Parse(EnvSchema,...)` (coerces+validates) or explicit `v !== undefined && v !== '' ? Number(v) : fallback`. | Low | Low |

> `packages/core/src/utils` (`safeJsonParse`, `sleep`, `Nullable`/`Optional` aliases, `Result`) is **idiomatic and NOT a finding** — left as-is.

---

## 4. `packages/infra`

| ID | File:line | Issue | Native / stdlib fix | Effort | Risk |
|----|-----------|-------|---------------------|--------|------|
| I1 | `packages/infra/src/external/ai/AiGatewayClient.ts:101-166` and `packages/infra/src/external/fxmacrodata/FxMacroDataClient.ts:329-350` | SSE `data:` line-buffering parser **duplicated** across two files (largest hand-rolled block). No stdlib SSE parser exists, but it must be de-duplicated. | Extract one shared `parseSseChunks()` helper (uses existing `TextDecoder`). | Med | Med |
| I2 | `packages/infra/src/external/fxmacrodata/FxMacroDataClient.ts:191-222` | Custom `fetchWithRetry` (HTTP retry/backoff). | **Keep** — no Node/TS stdlib or in-repo lib provides fetch-retry. Only the embedded `setTimeout` sleep was migrated (Q1). | — | — |
| I3 | `packages/infra/src/persistence/redis/redis-keys.ts:13`; `packages/infra/src/external/ai/AiGatewayClient.ts:166` | `process.env` read directly, bypassing centralized `env` from `@betrix/config`. | Route through `env` (already imported elsewhere). | Low | Low |
| I4 | `packages/infra/src/persistence/redis/redis-keys.ts` (`captchaLegacy`, `streamTicketLegacy`); `packages/infra/src/persistence/redis/RedisEphemeralStores.ts` (`DUAL_READ_LEGACY`) | Dead migration scaffolding (dual-read window hard-coded `true`). | Remove once cutover confirmed everywhere. | Low | Low |
| I5 | `packages/infra/src/persistence/redis/RedisMarketDataRepository.ts:22` | `Number(process.env.PRICE_STALE_MS) || 120_000` falsy-`0` bug. | **Already fixed** in Q3 → `Number(process.env.PRICE_STALE_MS ?? 120_000)`. | — | — |

> Already-fixed infra items (Q3): `RedisMarketDataRepository`, `RedisWorkerCommandBus`, 4 Drizzle repos.

---

## 5. `packages/application`

| ID | File:line | Issue | Native / stdlib fix | Effort | Risk |
|----|-----------|-------|---------------------|--------|------|
| A1 | `ContextInjectionService.ts:45`; `SendMessageUseCase.ts:44,48,71,108`; `StreamMessageUseCase.ts:48,74,115`; `CreateAgentUseCase/UpdateAgentUseCase` | **`Value.Decode` is never run at runtime** — every use-case re-applies `\|\| default` that the TypeBox schema already declares (drift bug; e.g. `includeNews` default `true` is effectively ignored). | Make the schema the single source of truth: `Value.Decode(Schema, rawInput)` at the input boundary; delete the `\|\| default` lines. | Low–Med | Low–Med |
| A2 | `GetAuditLogsUseCase.ts:49,52,53`; `CreateVoucherUseCase.ts` (same regex) | Hand-rolled UUID-validation regex duplicated. | Register `FormatRegistry.Set('uuid', ...)` once, use `Type.String({format:'uuid'})`. | Low | Low |
| A3 | `CreateAgentUseCase.ts:37`; `UpdateAgentUseCase.ts:39`; `SendMessageUseCase.ts:108`; `StreamMessageUseCase.ts:115`; `TestAgentUseCase.ts:37`; `ListModelsUseCase.ts:22` | Fixed-point temperature `×100` / `÷100` duplicated 6× (drift-prone encoding). | Store `temperature` as a plain number (DTO already `Type.Number`); or one domain helper `Temperature.toStoredPercent/fromStoredPercent`. | Med | Med (needs stored-value migration) |
| A4 | `ExportAuditLogsUseCase.ts:45` | Hand-rolled CSV field escaping. | No Node stdlib CSV — extract a small tested serializer (or keep, but centralize). | Low | Low–Med |
| A5 | `WorkerManagerService.ts:145` (`switch (action)`) | `switch` over `WorkerAction`. | Typed lookup table → exhaustiveness for free: `Record<WorkerAction, () => Promise<void>>`. | Low | Low |
| A6 | `StreamMessageUseCase.ts:104-209` (`settlePromise` + retry) | Custom credit-settlement "settle exactly once" retry. | **Keep** (no stdlib equivalent) — but it is the most complex async orchestration; candidate for extraction/clarification. | Med–High | Med (billing-critical) |

> Already-fixed application item (Q6): `console.warn` → shared `pino` logger.

---

## 6. `apps/api`

| ID | File:line | Issue | Native / stdlib fix | Effort | Risk |
|----|-----------|-------|---------------------|--------|------|
| P1 | `sse.plugin.ts:95` (`reply.raw.writeHead`); `chat.routes.ts:45-59`; `admin.routes.ts:82-86` | SSE writes to `reply.raw`, bypassing the Fastify lifecycle → CORS/helmet headers silently dropped; `reply.hijack()` never called. | `reply.send(stream)` with a `PassThrough` (Fastify pipes streams natively, preserves hooks/CORS). | Med | Med |
| P2 | `sse.plugin.ts:219,240` (`sendEvent`/`startHeartbeat`); `chat.routes.ts:52-59`; `toJSON` duck-typing `sse.plugin.ts:152,164` | SSE frame builder duplicated 3×; `tick.toJSON ? tick.toJSON() : tick` is dead work (`JSON.stringify` already calls `toJSON`). | One `writeSse(w,event,data)` helper; delete `toJSON` ternaries; call `hasClientsFor('ops')`. | Low | Low |
| P3 | `sse.plugin.ts:230,249` (`write() === false ⇒ removeClient`) | Misreads Node backpressure contract — a single burst on a momentarily busy socket kills a healthy subscriber. | `if (w.writableNeedDrain) { w.once('drain', flush); return }` then `writableLength > MAX ⇒ destroy`. | Low | Med |
| P4 | (private `pino()`) | **Fixed** in Q6 → `fastify.log.child({plugin:'sse'})`. | — | — | — |
| P5 | (client IDs `Date.now()`) | **Fixed** in Q5 → `randomUUID()`. | — | — | — |
| P6 | All route files; helper unused at `packages/application/src/schemas/common.schema.ts:44` (`SuccessEnvelopeSchema`) | **0 `response:` schemas**, 76 literal `{success:true}` envelopes, 33 `.map(x=>x.toJSON())`. Security gap: `User.toJSON()` (strips `passwordHash`) depends on devs remembering it. | Add `response:` schemas (fast-json-stringify) + one `preSerialization` hook for the envelope. | Med/High (mechanical, ~60 handlers) | Low/Med |
| P7 | `admin.routes.ts:129,358,552,1099`; `me.routes.ts:140,171`; `chat.routes.ts:114`; `market.routes.ts:44` | Manual query defaults / boolean coercion despite Ajv `useDefaults`+`coerceTypes`. | `const { page, limit } = request.query;` (schema already defaults). | Low | Low |
| P8 | `errorHandler.plugin.ts:19-83` (4-branch); `rateLimit.plugin.ts:67-81` (`errorResponseBuilder`) | Error status mapping duplicated; the **429 branch is dead** (rate-limit already built that exact envelope). | One `setErrorHandler` using `error.statusCode` + `node:http` `STATUS_CODES`; normalize validation once via `schemaErrorFormatter`. | Low | Low |
| P9 | `admin.routes.ts:61,202,261`; `auth.routes.ts:136` | `catch {} → 404` envelope in handlers (POSTgres down reported as "session not found"). | Throw `NotFoundError` (exists in `@betrix/core`); let `setErrorHandler` emit one canonical envelope. | Low | Low |
| P10 | `server.ts:54-61` (`onResponse`) | Re-implements `LogController.requestCompleted` (which it just disabled). | Subclass `LogController` and override `requestCompleted`/`isLogDisabled`. | Low | Low |
| P11 | `rateLimit.plugin.ts:27-59` (`incr`+`expire` = 2 HTTP calls); `:44` (`ttl: full window`); `:53` (`child()→this`) | Rate-limit store: 2 round-trips per hit, fake `ttl` (retry-after never counts down), `child()` returns `this` so auth & global buckets collide. | Upstash pipeline (`incr`+`pttl`) one round-trip; real `pttl`; `child(route) => new RedisRateLimitStore(...)`. | Low/Med | Med (brute-force protection) |
| P12 | `corsHelmet.plugin.ts:18,37` | Hand-rolled origin callback (dev/test allow any origin; `allowedOrigins` dead in dev). | `@fastify/cors` native: `origin: isDev ? true : allowedOrigins`. | Low | Low |
| P13 | `sse.plugin.ts:32,262-334` (`budgetDayUtc`, `consumeRedisBudget`, `startMarketTick`/`scheduleMarketTick`/`runMarketTick`) | In-process daily "global" budget + 3-field timer state machine: resets wrong across month boundary, per-process (N replicas ⇒ N× budget), manual timer bookkeeping. | Redis-native self-expiring counter (`INCR`+`EXPIRE`) + `node:timers/promises` cancellable loop; abort in `onClose`. | Med | Low/Med |
| P14 | `admin.routes.ts:37` (`createRedisClient()`); `:46-64` (`Promise.all` per-worker GET; `Date.now()-ts>=90000` re-implements TTL; `typeof raw==='string' ? JSON.parse`) | 2nd Redis client + N+1 GETs + manual TTL re-check + manual JSON parse in heartbeat overlay. | Reuse `fastify.container.redis`; `redis.mget(...)` (1 call); drop staleness branch (key TTL already guarantees freshness). | Low | Low |
| P15 | `container.plugin.ts:130` (interface), `:660` (object), `:440-658` (body) | 795-line manual DI container; every dependency name written 3×. | Fastify plugin encapsulation **is** the DI container: `fastify-plugin` `dependencies` + `declare module 'fastify'`. | High | Med |
| P16 | `container.plugin.ts:342-370` (news relay), `:417-438` (ops aggregator) | Background loops embedded in container; `seenNewsIds = new Set()` never pruned (memory leak); `setInterval` can't cancel mid-flight. | Watermark (`lastSeenAt`) instead of unbounded Set; cancellable loop aborted in `onClose`; or subscribe to `RedisWorkerCommandBus` instead of polling Postgres. | Med | Med |
| P17 | `container.plugin.ts:132,134,787-790` | `pgPool: any` / `redis: any`; Redis never closed on shutdown. | `import type { Pool } from 'pg'`; `redis: ReturnType<typeof createRedisClient>`; close Redis in `onClose`. | Low | Low |
| P18 | `auth.plugin.ts:63` (`(request as ...).authUser = user`), `:67-82` | `authUser` smuggled onto request via type-cast (deopts V8 shape; dead re-query at `:74-78`). | `fastify.decorateRequest('authUser', null)` + `declare module 'fastify'`. | Low | Low |
| P19 | `auth.routes.ts:53-57,87-91,121-125` → `AuthService.signJwt` | Bound `fastify.jwt.sign` passed through app layer; `signFn` typed `(payload:any)=>string` discards `JwtPayload`. | `const token = fastify.jwt.sign(toJwtPayload(...))` — pure mapper, typed `FastifyJWT` augmentation. | Low | Low |
| P20 | `server.ts:64` vs `health.routes.ts:7` | Two divergent health endpoints (bare `{status}` vs full envelope). | Keep probing one; `server.ts` `/health` → `reply.redirect` or delete (use `isLogDisabled` to keep probes out of logs). | Low | Low |
| P21 | `server.ts:92-93` (`process.on`), `:18` (`forceCloseConnections`) | `process.on` (not `once`) → double `shutdown()` on container restart; no `forceCloseConnections` backstop for SSE sockets. | `process.once('SIGTERM', ...)` + `forceCloseConnections: true`. | Low | Low |
| P22 | (regex `onRoute` rate-limit) | **Fixed** in Q7 → per-route `config.rateLimit`. | — | — | — |

---

## 7. `apps/worker`

| ID | File:line | Issue | Native / stdlib fix | Effort | Risk |
|----|-----------|-------|---------------------|--------|------|
| W1 | `sync-worker.ts:207-256` (`retryDelayMs`, `await setTimeout(retryDelayMs)`) | Hand-rolled fixed-delay retry loop (custom HTTP retry is legit; the loop should be a helper). | Extract one generic `retry(fn,{times,delayMs})` (0 new deps). | Low | Low |
| W2 | `calendar-worker.ts:236-238` (month-boundary date math) | `new Date(Date.UTC(cy, cm+1, 0))` month-end + `split('-').map(Number)`. | Broker-specific arithmetic has no stdlib but belongs in existing `BrokerTimeCalculator`; `Intl.DateTimeFormat('en-CA')` for string keys (date-key part already done in Q4). | Low | Low |
| W3 | `marketdata-backfill-lib.ts:68,160,227,295` (`FxSpotPriceBackfiller`, `CotPositionBackfiller`, `CommodityPriceBackfiller`, `UsdCatalogueBackfiller`) | 4 near-identical backfiller classes (own `createPgPool`, nested loops, per-chunk try/catch, same counters). | One generic `Backfiller<Row>` taking repo + fetch fn; reuse `resolvedYearSpan`. | Med | Med |
| W4 | `cot-backfill.ts:23-30`; `fx-backfill.ts:32-44`; `commodities-backfill.ts:24-32` | 3 bespoke CSV/env parsers (`split(',').map(trim/upper/lower).filter(...)` with slightly different casing). | One shared `parseList(raw,{transform,validate})`. | Low | Low |
| W5 | `shared/calendar-mapping.ts:158` (`lastIndexOf('_')`) | Fragile string slice to pull indicator slug out of `{currency}_{indicator}_{date}`. | Single anchored regex capture: `/_([^_]+)_(\d{4}-\d{2}-\d{2})$/`. | Low | Low |
| W6 | `ws-worker.ts:208` (`Math.min(3000*attempt, 20000)`) | Hand-rolled capped linear backoff. | No stdlib; extract shared `backoffDelay(attempt, base, max)` (reuse for W1). | Low | Low |
| W7 | `calendar-worker.ts:45,570-581` (`budgetDayUtc`, `consumeDailyBudget`) | Custom day-bucketed API budget counter (manual reset on `getUTCDate()` change). | No stdlib rate-limiter; centralize into one shared `DailyBudget` class (0 new deps). | Low | Low |
| W8 | `sync-worker.ts:216-224,242` (broker-date keys) | `toISOString().slice(0,10)` | **Fixed** in Q4 → `Intl.DateTimeFormat('en-CA')`. | — | — |
| W9 | `ManagedWorkerBase.ts` (leader lease, standby poll, command serializer) | Distributed leader election / CAS / heartbeat. | **Keep** — no Node/TS or in-repo dependency replaces it (`node-cron` already used correctly for scheduling). | — | — |

---

## 8. Recommended next-wave priority (post quick wins)

1. **P6 — response schemas + 1 `preSerialization` hook** (highest leverage: removes most repetition *and* closes the `passwordHash` leak-by-omission risk). Roll out route-by-route with `api.test.ts` as guard.
2. **P1 + P3 + P13 — SSE layer** (`reply.send(stream)` + `node:stream` + `node:timers/promises` + Redis-side budget). `sse.plugin.ts` should land ~180 lines instead of 355.
3. **A1 — `Value.Decode` at input boundary** so schemas become the source of truth (deletes `\|\| default` / UUID-regex duplication A2).
4. **W3 + W4 — worker dedupe** (generic `Backfiller` + `parseList`): ~250–300 lines removed, low risk.
5. **P15 + P16 — split `container.plugin.ts`** into per-domain `fp` plugins (do last; touches everything).

---

## 9. Verification status (2026-08-29)

- `pnpm -r build` (tsc): **PASS** (all 7 projects)
- `pnpm lint` (eslint): **PASS** (0 errors; 12 pre-existing warnings in `drizzle/schema/*.ts`, unrelated)
- `pnpm format:check` (prettier): **PASS**
- `pnpm test` (vitest): domain **44 passed**, application **28 passed**; infra **4 passed / 5 failed** due to `ECONNREFUSED` (no Postgres :5432 / Redis :8079 in sandbox — environmental, not code; stack traces reach the changed redis code and fail only at the network layer). Run `docker compose -f docker-compose.dev.yml up -d` to exercise the 5 integration tests.

*Generated for future reference — line numbers reflect the committed state at the time of writing.*
