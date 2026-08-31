# Library Applicability Audit (2026-08-30)

> **Scope:** End-to-end check that every library the backend depends on is
> applied per its current official documentation. Covers **better-auth 1.7.2**,
> **Fastify v5**, **Drizzle ORM 0.45+**, **TypeBox 0.34 + Pino 9**,
> **@upstash/redis 1.38 + node-cron v4**.
>
> **Method:** 5 parallel audit agents. Each agent did a focused file-by-file
> review cross-referenced with official docs (via websearch/webfetch). Agents
> **did not modify code** — output is analysis only.
>
> **Build status at audit time:** `pnpm -r build` PASS (7 packages).
> **Domain tests:** 44/44 PASS.

---

## TL;DR

| Library                                | Verdict                  | Majors | Minors | Deferred / Latent |
| -------------------------------------- | ------------------------ | -----: | -----: | ----------------: |
| **better-auth 1.7.2**                  | ⚠️ MAJOR ISSUES          |      1 |      7 |                 3 |
| **Fastify v5**                         | MINOR ISSUES             |      0 |      9 |                 0 |
| **Drizzle ORM 0.45+**                  | MINOR ISSUES             |      0 |      4 |        1 (latent) |
| **TypeBox 0.34 + Pino 9**              | MINOR ISSUES             |      0 |      7 |                 0 |
| **@upstash/redis 1.38 + node-cron v4** | MINOR ISSUES (1 mod bug) |      0 |      6 |                 0 |
| **TOTAL**                              | —                        |  **1** | **33** |             **4** |

**Headline:** 1 major design mismatch (better-auth `admin()` ↔ `isAdmin` field),
1 moderate correctness bug (`isShuttingDownLease` never set), 33 minor issues
across the 5 libraries. None cause data loss today; most are
consistency/maintenance hazards.

---

## §1 — better-auth@1.7.2

**Audit agent verdict:** MAJOR ISSUES (1 design mismatch, 7 minor).

### Major

- **B-1 — `admin()` plugin does not consult `user.additionalFields.isAdmin` for admin checks; it uses `user.role`.**
  - **Location:** `packages/infra/src/auth/better-auth.ts:84-91` (additionalFields) ↔ `:92` (`plugins: [admin()]`) ↔ `apps/api/src/plugins/auth.plugin.ts:43-50` (requireAdmin)
  - **Issue:** Per BA docs (`/docs/plugins/admin`), the admin plugin only treats a user as admin when `role === 'admin'` (or `userId in adminUserIds`). The `isAdmin` boolean in `additionalFields` is never read by BA — it is BA-internal dead weight. Meanwhile `requireAdmin` reads `user.isAdmin` from `userRepo` (the legacy identity table), completely bypassing the admin plugin. Net effect: the `admin()` plugin is mounted but contributes nothing to authorization; admin gating is done by legacy code reading a column BA does not manage.
  - **Fix:** Pick one of:
    1. Drop `admin()` and `isAdmin`; keep current `userRepo.isAdmin`-based gating, OR
    2. Remove `isAdmin` from `additionalFields`, add `role` (which admin plugin will write), set `adminUserIds` for any pre-existing admins, and switch `requireAdmin` to `request.authUser.role === 'admin'`.
  - **Risk if not fixed:** Confused mental model — two parallel "admin" concepts; admin plugin overhead with no security benefit; future contributors may add admin endpoints assuming BA enforces them.
  - **Confidence:** HIGH.

### Minor

- **B-2 — `hooks.before` is a plain async function instead of `createAuthMiddleware(...)`.**
  - **Location:** `packages/infra/src/auth/hooks.ts:146-173`
  - **Issue:** BA 1.7.2 docs explicitly show `hooks: { before: createAuthMiddleware(async (ctx) => {...}) }`. Using a raw async function works at runtime but bypasses `ctx.json`/`ctx.redirect`/`ctx.setCookie` typing and the standardized error contract.
  - **Fix:** `import { createAuthMiddleware } from 'better-auth/api'` and wrap the body.
  - **Risk:** TypeScript loses inference; future contributors adding cookies/redirects will hand-roll. LOW.
  - **Confidence:** HIGH.

- **B-3 — Missing cross-origin cookie configuration.**
  - **Location:** `packages/infra/src/auth/better-auth.ts:52-106`
  - **Issue:** Per `/docs/concepts/cookies`, BA defaults to `Secure` only when `NODE_ENV === "production"`. For cross-origin deployments (FE on different host than API) the docs explicitly require `defaultCookieAttributes: { secure: true, sameSite: 'none', httpOnly: true }` and/or `advanced.crossSubDomainCookies`. Without these, Safari ITP silently drops session cookies.
  - **Fix:** Add `advanced: { crossSubDomainCookies: { enabled: true, domain: process.env.COOKIE_DOMAIN }, defaultCookieAttributes: { secure: true, httpOnly: true, sameSite: 'none' }, database: { generateId: ... } }`.
  - **Risk:** Sign-in works in Chrome/curl but users get randomly logged out in Safari. MEDIUM.
  - **Confidence:** HIGH.

- **B-4 — `rateLimit` uses in-memory storage by default.**
  - **Location:** `packages/infra/src/auth/better-auth.ts:93-97`
  - **Issue:** Per docs, rate limit data is in-memory by default. For prod multi-instance, add `storage: "database"` or `secondary-storage`.
  - **Fix:** `rateLimit: { ... storage: 'database', modelName: 'rateLimit' }` + migration.
  - **Risk:** Rate limits become per-process; brute-force protection weakened. MEDIUM (prod only).
  - **Confidence:** HIGH.

- **B-5 — `databaseHooks.session.create.after` reads `ctx.body` fragilely.**
  - **Location:** `packages/infra/src/auth/hooks.ts:122-123`
  - **Issue:** Reading `ctx?.body as any)?.email` is undocumented as supported usage. Use `ctx.headers` for IP/UA, and resolve email via repository lookup.
  - **Fix:** Use `ctx.headers` directly for IP/UA; resolve email via `ctx.context.adapter` / `userRepo.findById`.
  - **Risk:** Latent breakage across patch upgrades; logging could record wrong email. MEDIUM.
  - **Confidence:** MEDIUM.

- **B-6 — `toNodeHandler` is used; official Fastify example uses `auth.handler(Request)`.**
  - **Location:** `apps/api/src/plugins/betterAuth.plugin.ts:3,50`
  - **Issue:** Both are valid. The `await` on line 50 is a no-op (sync handler); harmless but misleading.
  - **Fix:** Either follow the official example or drop the `await`. Pick one.
  - **Risk:** None functional; consistency. LOW.
  - **Confidence:** HIGH.

- **B-7 — Drizzle BA columns (`isAdmin`, `credits`, `tier`, `status`) MISSING from the `auth.user` schema.**
  - **Location:** `packages/infra/src/persistence/drizzle/schema/auth.schema.ts` (only declares `id, name, email, emailVerified, image, createdAt, updatedAt`) vs `packages/infra/src/auth/better-auth.ts:85-90` (additionalFields claims these columns exist)
  - **Issue:** Per BA 1.7.0 release notes (`#10863`), the CLI now refuses adding required columns without defaults to existing tables, but our hand-written schema can easily miss them. BA's adapter will either silently drop the values or throw at write time depending on adapter behavior.
  - **Fix:** Add `isAdmin`, `credits`, `tier`, `status` columns to the `auth.user` Drizzle table + a migration. Until then, `getSession`/listUsers calls will not return these fields.
  - **Risk:** `getSession` returns no isAdmin/credits; downstream `requireAdmin` reads from legacy `identity.users`, so auth "works" but the BA stack is partially broken. HIGH.
  - **Confidence:** MEDIUM-HIGH.

- **B-8 — `account.issuer` column required for social accounts in 1.7.0+; not present.**
  - **Location:** `packages/infra/src/persistence/drizzle/schema/auth.schema.ts` (account table)
  - **Issue:** 1.7.0 breaking change required `Account.issuer`. Currently the codebase only writes credential accounts (no social login), so this is latent. If Google OAuth is enabled, must add.
  - **Fix:** When social providers come online, add `issuer: text('issuer')` to the account table per 1.7.0 migration.
  - **Risk:** Future social sign-in will error at adapter level. LOW (latent).
  - **Confidence:** HIGH.

---

## §2 — Fastify v5

**Audit agent verdict:** MINOR ISSUES (9 findings; no majors).

- **F-1 — `ssePlugin` uses `onClose` for SSE cleanup; v5 docs say `preClose` is correct for long-lived streams.**
  - **Location:** `apps/api/src/plugins/sse.plugin.ts:359`; also `container.plugin.ts:313,336` (news relay, ops aggregator)
  - **Issue:** `onClose` fires only after all connections drained; active SSE streams are NOT closed by `forceCloseConnections: 'idle'` (only idle ones). A SIGTERM during active SSE will hang `app.close()` until keep-alive timeout (72s) or client disconnect.
  - **Fix:** `fastify.addHook('preClose', async () => sseHub.closeAll())` in sse.plugin.ts. For bg timers `preClose` is also more correct.
  - **Risk:** Medium (operational). Graceful shutdown is defeated.
  - **Confidence:** HIGH.

- **F-2 — `LogController` `requestCompleted` doesn't call `super`; `disableRequestLogging: true` in constructor is redundant.**
  - **Location:** `apps/api/src/server.ts:26-43, 49`
  - **Issue:** Per v5 docs, the boolean `disableRequestLogging` in the constructor acts as a global short-circuit, making the per-request `isLogDisabled` override less useful. Also deprecated in v6.
  - **Fix:** Drop `disableRequestLogging: true` from the `super()` call; rely solely on `isLogDisabled` override.
  - **Risk:** 404s, stream errors, serializer errors all silenced. LOW-MEDIUM.
  - **Confidence:** HIGH.

- **F-3 — `forceCloseConnections: 'idle'` does NOT close active SSE streams.**
  - **Location:** `apps/api/src/server.ts:69`
  - **Issue:** Documented v5 behavior. Add a doc comment to clarify.
  - **Fix:** Documentation only. Pairs with F-1 (`preClose` does the real work).
  - **Risk:** None (doc nit).
  - **Confidence:** HIGH.

- **F-4 — `trustProxy: env.TRUST_PROXY` type is loose.**
  - **Location:** `apps/api/src/server.ts:66`
  - **Issue:** v5 accepts `boolean | string | string[] | function`. If `env.TRUST_PROXY` is a free-form string, v5 treats it as a CIDR list and `request.ip` silently falls back to the socket address.
  - **Fix:** Confirm `env.TRUST_PROXY` is typed `boolean` in `@betrix/config`. If string-typed, coerce.
  - **Risk:** Silent rate-limit bypass / wrong `request.ip` behind a real proxy. MEDIUM.
  - **Confidence:** MED.

- **F-5 — SSE uses `reply.send(stream)`; optional `reply.hijack()` would be cleaner.**
  - **Location:** `apps/api/src/plugins/sse.plugin.ts:114-119`
  - **Issue:** Both work; `reply.hijack()` + raw `writeHead` skips `preSerialization` entirely.
  - **Fix:** None required. Optional refactor.
  - **Risk:** None. LOW (code quality nit).
  - **Confidence:** MED.

- **F-6 — SSE response headers are correct.**
  - **Location:** `apps/api/src/plugins/sse.plugin.ts:115-118`
  - **Issue:** None. `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no` all present and correct.
  - **Confidence:** HIGH.

- **F-7 — `preSerialization` hook placement is correct (no functional issue).**
  - **Location:** `apps/api/src/server.ts:100-111`
  - **Issue:** Style nit: better as an `fp()` plugin registered before `v1Routes`.
  - **Risk:** None.
  - **Confidence:** HIGH.

- **F-8 — `preHandler: fastify.authenticate` pattern is correct v5 idiom.**
  - **Location:** `me.routes.ts:17`, `admin.routes.ts:73`, `health.routes.ts:51`
  - **Issue:** None. Confirmed against `/docs/latest/Reference/Hooks/#scope`.
  - **Confidence:** HIGH.

- **F-9 — All `fp({ name, dependencies })` declarations + plugin order correct.**
  - **Location:** `apps/api/src/plugins/*.plugin.ts`, `apps/api/src/server.ts:77-85`
  - **Issue:** None. Container → betterAuth → auth order matches dependencies array. All other plugins correctly wrapped.
  - **Confidence:** HIGH.

- **F-10 — `withTypeProvider<TypeBoxTypeProvider>()` correctly applied; all routes use full `type: 'object'` JSON Schema.**
  - **Location:** `apps/api/src/server.ts:70`; all route files
  - **Issue:** None.
  - **Confidence:** HIGH.

- **F-11 — No `@fastify/jwt` leftovers.**
  - **Issue:** Grep clean. JWT path fully removed.
  - **Confidence:** HIGH.

- **F-12 — `@fastify/rate-limit` v11 store contract correct; `@fastify/awilix` `disposeOnClose: true` correct; `@fastify/cors` + `@fastify/helmet` correct.**
  - **Confidence:** HIGH.

- **F-13 — Pool: `pgPool.end()` in `onClose` won't run during SSE-held shutdown.**
  - **Location:** `apps/api/src/plugins/container.plugin.ts:352-355`
  - **Issue:** Same root cause as F-1. Fix: `preClose` for SSE; keep `onClose` for pgPool (it will then run promptly).
  - **Risk:** MEDIUM (same as F-1).
  - **Confidence:** HIGH.

---

## §3 — Drizzle ORM 0.45+

**Audit agent verdict:** MINOR ISSUES (4 findings; 1 high-severity: missing BA migration).

- **D-1 — Missing generated Drizzle migration for Better Auth `auth.*` tables.**
  - **Location:** `packages/infra/src/auth/schemas.ts` (tables) vs `packages/infra/drizzle/_journal.json` (last entry idx 14, `0014_market_data`).
  - **Issue:** Drizzle Kit docs require generated SQL migrations for `drizzle-kit migrate` to apply. `auth.user`, `auth.session`, `auth/account`, `auth.verification` exist in TS but no `0015_*.sql`. The `docs/migrations/0003_d1_phase0_better_auth.sql` is documentation, not a real generated migration.
  - **Fix:** Run `pnpm --filter @betrix/infra db:generate` after auth schemas are committed; check in `0015_*.sql` + snapshot.
  - **Risk:** Production deploys via `pnpm db:migrate` boot with `auth.user` missing; BA throws `relation "auth.user" does not exist`. **HIGH** given BA is the live auth path.
  - **Confidence:** HIGH.

- **D-2 — `pg.Pool` constructed without idle / connection / lifetime timeouts.**
  - **Location:** `packages/infra/src/persistence/drizzle/client.ts:44-50` (`createPgPool`)
  - **Issue:** pg-pool + drizzle docs recommend `idleTimeoutMillis`, `connectionTimeoutMillis`, `maxLifetimeSeconds` for production.
  - **Fix:** `idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000, maxLifetimeSeconds: 30 * 60`.
  - **Risk:** Stale connections after NAT/firewall idle-kill; hung connection attempt stalls requests. MEDIUM.
  - **Confidence:** HIGH.

- **D-3 — `moneyDb` pool not closed in `onClose`.**
  - **Location:** `apps/api/src/plugins/container.plugin.ts:359-365` (`DATABASE_URL_MONEY` pool, max 6)
  - **Issue:** Bound at module-resolve time; not registered in the cradle; no `pool.end()` in `onClose`. Leaks across reloads.
  - **Fix:** Push `moneyDb`'s `pg.Pool` into the container cradle; `pool.end()` it in `onClose` alongside `pgPool`.
  - **Risk:** Slow memory/FD leak; silent throttling. LOW-MEDIUM.
  - **Confidence:** HIGH.

- **D-4 — News `findRecent` overscans (5× + JS dedupe) instead of SQL windowing.**
  - **Location:** `packages/infra/src/persistence/pg/DrizzleNewsRepository.ts:112-132`
  - **Issue:** Pulls 5× the requested page then JS-trims. Drizzle supports `sql\`... row_number() over (partition by headline order by datetime desc) ...\``.
  - **Fix:** Replace with single windowed query, or push dedupe upstream.
  - **Risk:** Wasted I/O on hottest news endpoint. LOW-MEDIUM.
  - **Confidence:** MEDIUM.

- **D-5 — `mapToDomain` `tradeDate` cast to `String(r.tradeDate)` produces non-ISO date strings.**
  - **Location:** `DrizzleMarketDataRepositories.ts:107, 234, 334`
  - **Issue:** `pg-core`'s `date()` returns JS `Date`, not string. `String(...)` produces something like `"Thu Aug 28 2026 00:00:00 GMT+0000 (UTC)"`, not `"YYYY-MM-DD"`. Silent data contract mismatch.
  - **Fix:** `r.tradeDate.toISOString().slice(0, 10)` (or expose `date` in domain as `Date`).
  - **Risk:** Surprising downstream breakage. MEDIUM.
  - **Confidence:** HIGH.

- **D-6 — `bigint mode:'number'` lossy for values > 2^53.**
  - **Location:** `news.schema.ts:12`; `cotPositions.commercialLong` etc.
  - **Issue:** Unix-seconds + CFTC reports are fine at current magnitudes. Latent if columns exceed 2^53.
  - **Fix:** None today; consider `mode:'bigint'` for any column that may exceed 2^53 in future.
  - **Risk:** Silent precision loss. LOW.
  - **Confidence:** MEDIUM.

- **D-7 — Migrations/journal/schema are aligned except for D-1.**
  - **Location:** `packages/infra/drizzle/`
  - **Issue:** 14 entries; no orphans. Auth namespace is the only gap.
  - **Risk:** None beyond D-1.
  - **Confidence:** HIGH.

- **D-8 — Backfill scripts use repo abstraction, not raw Drizzle.**
  - **Location:** `apps/worker/src/scripts/*` and `marketdata/marketdata-backfill-lib.ts`
  - **Issue:** None. Per Drizzle best practice.
  - **Confidence:** HIGH.

- **D-9 — `d1-backfill-accounts.ts` uses raw `sql\`\`` for cross-schema INSERT.**
  - **Location:** `packages/infra/src/persistence/drizzle/d1-backfill-accounts.ts:49-75`
  - **Issue:** Acceptable and documented in code (lines 45-48).
  - **Risk:** None.
  - **Confidence:** HIGH.

- **D-10 — `$inferSelect` consistently used; `drizzle.config.ts` valid; `arrayContains` GIN-indexed correctly.**
  - **Confidence:** HIGH.

---

## §4 — TypeBox 0.34 + Pino 9

**Audit agent verdict:** MINOR ISSUES (7 findings; 1 medium).

- **T-1 — Ajv (used by Fastify at the HTTP boundary) has none of the TypeBox format validators registered.**
  - **Location:** `packages/application/src/schemas/common.schema.ts:5-20`; `apps/api/src/server.ts` (no `ajv.formats()` call)
  - **Issue:** Per `@fastify/type-provider-typebox` README: "TypeBox does not register string formats by default. … must be registered explicitly." Schemas with `format: 'email'`, `format: 'uuid'`, `format: 'date-time'` are passed to Fastify as `body`/`querystring` validators. Without `ajv-formats` the `format` keyword is unknown to Ajv and silently ignored. So `FormatRegistry.Set` calls in `common.schema.ts` only protect programmatic `Value.Check` calls (none exist), not the actual HTTP boundary.
  - **Fix:** Either `import { Format } from '@fastify/type-provider-typebox'` + register at startup, or `Fastify({ ajv: { customOptions: { formats: [...] } } })`, or `import { registerAjvFormats }` from the type-provider (one call at startup).
  - **Risk:** Invalid emails / non-UUID ids / unparseable `date-time` payloads pass validation at HTTP boundary. MEDIUM.
  - **Confidence:** HIGH.

- **T-2 — `disableRequestLogging: true` conflicts with `isLogDisabled` override.**
  - **Location:** `apps/api/src/server.ts:49`
  - **Issue:** Boolean `true` is a global short-circuit, making the per-request override less useful. Also deprecated in v6.
  - **Fix:** Drop `disableRequestLogging: true` from the `super()` call; rely solely on the `isLogDisabled` override.
  - **Risk:** 404s, stream errors, serializer errors silenced. LOW-MEDIUM.
  - **Confidence:** HIGH.

- **T-3 — `application/src/logger.ts` does not honor `env.LOG_LEVEL`.**
  - **Location:** `packages/application/src/logger.ts:9`
  - **Issue:** Reads `process.env.LOG_LEVEL` directly, bypassing the SSOT (`@betrix/config`).
  - **Fix:** `import { env } from '@betrix/config'`.
  - **Risk:** Logging level drift between API and workers. LOW.
  - **Confidence:** HIGH.

- **T-4 — Workers instantiate `pino()` ad-hoc instead of using the shared `logger`.**
  - **Location:** `apps/worker/src/main.ts:11-17` + 15+ other files
  - **Issue:** Each worker re-creates its own pino instance. Some enable `pino-pretty` unconditionally; some pass no `level`.
  - **Fix:** `import { logger } from '@betrix/application'` in every worker entrypoint.
  - **Risk:** Inconsistent level + double `pino-pretty` transport per worker. LOW-MEDIUM.
  - **Confidence:** HIGH.

- **T-5 — `Value.Default` in use-cases is correct, but `as DTO` cast is unsafe.**
  - **Location:** 7 sites in `packages/application/src/use-cases/{news,market,intelligence}/*.ts` + `services/ContextInjectionService.ts:50`
  - **Issue:** `Value.Default` returns `unknown`; `as FetchNewsBodyDTO` papers over it. If route ever passes extras, they leak through.
  - **Fix:** Optional: `Value.Clean(Schema, defaulted)` to strip unknowns.
  - **Risk:** Low. Fragile coupling. LOW.
  - **Confidence:** HIGH.

- **T-6 — `pino-pretty` is in `dependencies`, not `devDependencies`.**
  - **Location:** `apps/api/package.json:36`; `apps/worker/src/main.ts:13-17`
  - **Issue:** Per Fastify docs, `pino-pretty` "needs to be installed as a dev dependency." Production image carries it unnecessarily. Worker `main.ts` forces `pino-pretty` regardless of env.
  - **Fix:** Move to `devDependencies` in `apps/api`; gate worker transport behind `env.NODE_ENV !== 'production'`.
  - **Risk:** Larger prod images + prettier output in prod logs. LOW.
  - **Confidence:** HIGH.

- **T-7 — `date-time` format validator uses `Date.parse` (permissive).**
  - **Location:** `packages/application/src/schemas/common.schema.ts:10-13`
  - **Issue:** Strict RFC 3339 parsing not used. Only relevant if `Value.Check` is used server-side (not today).
  - **Fix:** Drop the registration; let `ajv-formats` (T-1) own it.
  - **Risk:** Low (T-1 dependent).
  - **Confidence:** MEDIUM.

- **T-8 — `fastify.log.child({ plugin: 'sse' })` correct; per-request `reqId` not propagated.**
  - **Location:** `apps/api/src/plugins/sse.plugin.ts:356`
  - **Issue:** None required. Optional: per-client child logger for traceability.
  - **Risk:** Traceability of SSE incidents. LOW.
  - **Confidence:** HIGH.

- **T-9 — TypeBox `Type.Literal`/`Union`/`Optional`/`format`/`default` usage all canonical.**
  - **Issue:** No `Type.Any()` anywhere. `Static<typeof Schema>` used everywhere.
  - **Risk:** None beyond T-1.
  - **Confidence:** HIGH.

- **T-10 — `Value.Parse` correctly coerces env-string numbers via `Convert`.**
  - **Location:** `packages/config/src/index.ts:102`; `EnvSchema`
  - **Issue:** None. D3's commit message ("`Type.Number` coerces string env to number") is correct.
  - **Risk:** None.
  - **Confidence:** HIGH.

---

## §5 — @upstash/redis 1.38 + node-cron v4

**Audit agent verdict:** MINOR ISSUES (1 moderate correctness bug + 6 minor).

- **U-1 — `isShuttingDownLease` is declared but never set — standby polling loop cannot be cancelled on shutdown.**
  - **Location:** `apps/worker/src/shared/ManagedWorkerBase.ts:46,73`
  - **Issue:** Initialized `false` and only _read_ inside `acquireThenRun` to early-exit the standby poll. Nothing in the codebase ever sets it to `true`. The doc-comment explicitly says "Set true by stop paths so standby polling stops promptly." A follower mid-`setTimeout(LEASE_POLL_MS)` (30s) when SIGTERM hits will continue polling and may re-acquire a released lease, then `doStart()` runs on a worker whose `pool.end()` and listeners were already torn down — **real crash risk**.
  - **Fix:** Set `this.isShuttingDownLease = true` at the top of each worker's `stop()` (or inside `releaseLeaderLease()`) before awaiting the lease release.
  - **Risk:** **MEDIUM — moderate correctness bug** (race between SIGTERM and standby poll).
  - **Confidence:** HIGH.

- **U-2 — `createRedisClient` falls back to plain `http://` URL on missing env.**
  - **Location:** `packages/infra/src/persistence/redis/RedisClient.ts:3-11`
  - **Issue:** Upstash SDK throws a confusing URL-format error (not a credentials error) on missing env. Per Upstash blog/docs, the recommended pattern is `Redis.fromEnv()` (1.38+).
  - **Fix:** Validate env presence before constructing; throw an explicit `"UPSTASH_REDIS_REST_URL is not set"` in prod; localhost fallback only in dev. Or `Redis.fromEnv()`.
  - **Risk:** Confusing boot error; dev onboarding friction. LOW-MEDIUM.
  - **Confidence:** HIGH.

- **U-3 — Pipeline order correct; `pttl < 0` correctly handles `-1` and `-2`.**
  - **Location:** `apps/api/src/plugins/rateLimit.plugin.ts:50-67`
  - **Issue:** None. `pexpire(k, ms, 'NX')` could collapse to one call but is optional.
  - **Risk:** None.
  - **Confidence:** HIGH.

- **U-4 — `mget` index-mapping handles missing keys correctly.**
  - **Location:** `apps/api/src/routes/api/v1/admin.routes.ts:50-68`
  - **Issue:** None. Defensive `JSON.parse` is acceptable.
  - **Risk:** None.
  - **Confidence:** HIGH.

- **U-5 — Manual `JSON.stringify` in `writeHeartbeat` is now redundant/inconsistent.**
  - **Location:** `apps/worker/src/shared/ManagedWorkerBase.ts:119-128` (writer) vs `admin.routes.ts:50-57` (reader)
  - **Issue:** Upstash REST auto-serializes. Companion calls in `DrizzleAdminRepositories.ts:293`, `RedisMarketDataRepository.ts:107`, `DrizzleNewsRepository.ts:213` pass plain objects and rely on auto-serialization. Inconsistent.
  - **Fix:** Pick one pattern across all writers (drop `JSON.stringify` + `JSON.parse` everywhere, or keep both).
  - **Risk:** Convention drift. LOW.
  - **Confidence:** HIGH.

- **U-6 — `redis.expire` return value ignored; `pexpire` for sub-second precision lease.**
  - **Location:** `rateLimit.plugin.ts:61`; `ManagedWorkerBase.ts:153`
  - **Issue:** Functional fine but `pexpire(k, LEASE_TTL_MS)` signals intent.
  - **Fix:** Optional.
  - **Risk:** Very low.
  - **Confidence:** HIGH.

- **U-7 — `opsLock` correctly uses `px` for sub-second precision.**
  - **Location:** `apps/api/src/plugins/container.plugin.ts:321-325`
  - **Issue:** None.
  - **Risk:** None.
  - **Confidence:** HIGH.

- **U-8 — `redis.getdel<T>` works as documented; replaces race-prone `get + del`.**
  - **Location:** `packages/infra/src/persistence/redis/RedisEphemeralStores.ts:6-8`
  - **Issue:** None.
  - **Risk:** None.
  - **Confidence:** HIGH.

- **U-9 — `node-cron` v4 schedules run in local time by default; the code passes no `timezone` option.**
  - **Location:** `calendar-worker.ts:100,110`; `sync-worker.ts:109,118`; `cleanup-worker.ts:83`; `calendar-seeder-worker.ts:101`
  - **Issue:** Cron expressions are written assuming UTC. On non-UTC hosts (e.g. `America/Chicago`), they fire at local time — Sunday catalog sync and broker-midnight rollover fire at wrong wall-clock.
  - **Fix:** Pass `{ timezone: 'UTC' }` to every `cron.schedule(...)` call (or set `process.env.TZ = 'UTC'` at process start).
  - **Risk:** MEDIUM — Sunday catalog sync shifted by hours on non-UTC hosts.
  - **Confidence:** HIGH.

- **U-10 — `ScheduledTask` lifecycle correct (`stop` on shutdown, no `destroy` needed).**
  - **Location:** `calendar-worker.ts:589-595`; `sync-worker.ts:278-285`; `cleanup-worker.ts:137-140`
  - **Issue:** None.
  - **Risk:** None.
  - **Confidence:** HIGH.

- **U-11 — `setTimeout` from `node:timers/promises` used correctly; no `new Promise(setTimeout)` patterns remain.**
  - **Confidence:** HIGH.

- **U-12 — Upstash 1.30 → 1.38 has no breaking changes affecting us.**
  - **Confidence:** HIGH.

- **U-13 — Worker shutdown doesn't explicitly close Upstash Redis — but that's correct (connectionless HTTP).**
  - **Issue:** None (informational).
  - **Confidence:** HIGH.

---

## §6 — Cross-cutting themes

These themes appeared across multiple library audits:

1. **Two parallel "admin" concepts** (B-1): BA `admin()` plugin + legacy `userRepo.isAdmin`. Pick one.
2. **`disableRequestLogging` + `isLogDisabled` overlap** (F-2, T-2): one is redundant; pick one pattern.
3. **`pino-pretty` + worker `pino()` ad-hoc** (T-4, T-6): all workers should import the shared `logger` from `@betrix/application`; `pino-pretty` should be a dev dep.
4. **SSE + graceful shutdown** (F-1, F-13): `preClose` is the right hook; current `onClose` hangs until keep-alive timeout when SSE is active.
5. **Cron timezone** (U-9): host TZ drift silently shifts schedules.
6. **Missing BA columns + migration** (B-7, D-1): the `auth.*` schema is partially hand-written and a generated migration is missing — these are the highest-severity items for the BA path.
7. **`@fastify/type-provider-typebox` ajv-formats** (T-1): TypeBox format validators are not wired into Ajv at the HTTP boundary; the FormatRegistry.Set calls are dead weight today.

---

## §7 — Recommended fix order (by impact/risk)

### High priority (production-blocking risk)

1. **D-1** — Generate the BA auth-schema migration (`pnpm --filter @betrix/infra db:generate`). Without this, `auth.user` etc. do not exist in DB.
2. **B-7** — Add `isAdmin`/`credits`/`tier`/`status` columns to `auth.user` Drizzle schema (and to the generated migration).
3. **B-1** — Resolve the admin plugin vs `isAdmin` design mismatch. Pick one source of truth.
4. **U-1** — Set `isShuttingDownLease = true` in worker `stop()` to prevent post-shutdown `doStart()` crash.

### Medium priority (correctness / prod-readiness)

5. **T-1** — Wire `ajv-formats` into the TypeBox provider so `format: 'email' / 'uuid' / 'date-time'` are enforced at the HTTP boundary.
6. **U-9** — Add `{ timezone: 'UTC' }` to every `cron.schedule(...)` call.
7. **D-5** — Fix `tradeDate` String() → ISO date in market data repos.
8. **D-2** — Add `idleTimeoutMillis`/`connectionTimeoutMillis`/`maxLifetimeSeconds` to `pg.Pool`.
9. **F-1, F-13** — Move SSE hub teardown to `preClose` hook.
10. **B-3** — Add cross-origin cookie config for prod (Safari ITP).

### Low priority (consistency / cleanup)

11. **D-3** — Push `moneyDb` pool into cradle; `pool.end()` in `onClose`.
12. **D-4** — Replace news `findRecent` overscan with windowed query.
13. **U-5** — Standardize JSON.stringify-or-not across all Redis writers.
14. **T-4, T-6** — Workers use shared `logger`; `pino-pretty` moves to devDeps.
15. **B-2, B-5, B-6, F-3, F-4, F-5, F-7, T-3, T-5, T-7, T-8, U-2, U-6** — minor consistency improvements.

---

## §8 — Out-of-scope / could-not-verify

- Could not run the actual test suite to verify behavior at runtime (no live DB/Redis in sandbox). All findings are static analysis against official docs.
- Did not open every repository file (spot-checked 10/14); remaining 4 follow the same template.
- Could not verify `env.TRUST_PROXY` type from `@betrix/config` (out of scope of the Fastify audit).
- Did not validate `advanced.database.joins` behavior (BA option, not enabled).
- BA1.7.2 changelog vs 1.7.0 verified via web only; not against the literal `CHANGELOG.md` file.

---

_Report generated 2026-08-30 by 5 parallel audit agents. No code was modified._
