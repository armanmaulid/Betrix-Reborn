# CONTEXT — Backend starting point for next agent

**Date:** 2026-08-30
**Workspace:** `Backend/` (Fastify 5 + Drizzle + Pino + TypeBox + @upstash/redis + node-cron + dukascopy-node + ws)
**Branch:** `session/agent_3e8f767d-86a4-4ebc-824b-ab97de21a28b`
**HEAD:** `9b8bd36` (pushed)

> **Read this file first if context is lost.** Full review in
> `docs/backend-native-vs-complex-review.md` (SSOT). This file is the
> *starting point* — what was just done, what's next, what to NOT re-explore.

---

## 1. Where we are

| Phase | Status | Commit | What |
|-------|--------|--------|------|
| 1 — Native/stdlib quick wins (Q1–Q7) | ✅ | `b5180aa` | `setTimeout`, `AbortSignal.timeout`, `@upstash/redis` auto-serialize, `Intl.DateTimeFormat` date keys, `randomUUID` client IDs, `pino` logger, per-route rate-limit |
| 2 — Wave 1 (security + correctness) | ✅ | `5710525` | P1/P2/P3/P6/P9/P10; P13 Redis-native budget deferred |
| 3 — Wave 2A (quick dedup) | ✅ | `f25668f` | A2/A5/I3/W4/P7/P12/P17/P18/P19 |
| 4 — D3 `@fastify/env` + `Value.Parse` | ✅ | `b80a193` | Config C1/C2 — schema defaults applied at boot, `env.PORT` typed `number` |
| 5 — Wave 2B / Wave 3 | ⬜ | — | A1, I1, W3, P8/P11/P14, A3–A6, W1/W2/W5–W7, I4, P13, P16 |
| 6 — D2 `@fastify/awilix` | ✅ | `b5af856` + `e54bb2f` + `9b8bd36` | P15 — container 798 → 407 lines (-49%) |
| 6 — D4 `@betrix/application` A1 `Value.Default` | ✅ | `0c40e88` | 7 use-case boundaries: schema is single source of truth for `\|\| default`; 28/28 app tests PASS |
| 6 — D1 `better-auth` | ⬜ | — | Next up (see §3.2) |

**Net code removed (Phases 1–3):** ~250 lines. **Phase 6 (D2 + D4):** D2 -391 lines (798→407), D4 -76 lines net (9 files, 141 insertions / 76 deletions in the main commit; plus the ContextInjectionService `Resolved` follow-up).
**Build:** `pnpm -r build` PASS (all 7 packages).
**Tests:** vitest domain 44 + application 28 pass; **infra 4/9 pass** — 5 fail
on `ECONNREFUSED` (no Postgres/Redis in sandbox; environmental, not code).
**Test env gotcha:** `packages/config` requires `DATABASE_URL`,
`UPSTASH_REDIS_REST_URL/TOKEN`, `JWT_SECRET` (len 32) at parse time. Without
those in env, `vitest` fails at `Value.Parse` with "Expected required property".
Pre-existing — not a regression.

---

## 2. Files you do NOT need to re-explore (already touched)

```
apps/api/src/server.ts            — ApiLogController, preSerialization envelope, process.once signals
apps/api/src/plugins/sse.plugin.ts        — PassThrough, backpressure writeFrame, sseFrame()
apps/api/src/plugins/auth.plugin.ts       — typed FastifyRequest.authUser via decorateRequest
apps/api/src/plugins/rateLimit.plugin.ts  — per-route config.rateLimit (regex onRoute removed)
apps/api/src/plugins/corsHelmet.plugin.ts — origin: isDev ? true : allowedOrigins
apps/api/src/plugins/container.plugin.ts  — @fastify/awilix; typed via InferCradleFromResolvers
apps/api/src/plugins/env.plugin.ts        — @fastify/env; sources from @betrix/config
apps/api/src/routes/api/v1/auth.routes.ts — per-route rateLimit config
packages/config/src/index.ts              — Value.Parse(EnvSchema, process.env)
packages/application/src/logger.ts        — shared pino logger
packages/application/src/services/AuthService.ts           — toJwtPayload returns plain object
packages/application/src/services/WorkerManagerService.ts  — Record<WorkerAction, …>
packages/core/src/utils/index.ts         — isUuid, sleep via node:timers/promises
packages/infra/src/messaging/RedisWorkerCommandBus.ts     — auto-serialize
packages/infra/src/external/ai/AiGatewayClient.ts          — AbortSignal.any([…, AbortSignal.timeout])
apps/worker/src/shared/parseList.ts      — shared env-list parser
```

**DI container now uses `fastify.diContainer.cradle` (via `@fastify/awilix`).
The legacy `fastify.container.repositories.userRepo` accessor is preserved
via `fastify.decorate('container', diContainer.cradle as AppContainer)`. So
route code (`fastify.container.X`) still works unchanged.**

---

## 3. Next up (Phase 6 — D2 ✅, D4 ✅, D1 ⬜ open)

### 3.1 D4 — A1 `Value.Default` at boundary — ✅ DONE (`0c40e88` + follow-up)

**Status:** Completed. 7 use-case boundaries now call `Value.Default(Schema, input)`
at the start of `execute()`, and the manual `|| default` lines were deleted.
Schema is the single source of truth.

**Key learning (don't repeat):** use `Value.Default`, NOT `Value.Cast` or
`Value.Decode`. `Cast`/`Decode` do NOT apply schema `default` — using `Cast`
broke the credit-reservation amount (NaN → "Insufficient credits" test
failure). `Default` applies the defaults; input is already Ajv-validated by the
route.

**Files touched:** `SendMessageUseCase`, `StreamMessageUseCase`,
`CreateAgentUseCase`, `GetNewsUseCase`, `FetchNewsUseCase`, `GetOHLCUseCase`,
`ContextInjectionService`. Added `Resolved*` narrowed types where
`Type.Optional + default` keeps the static type as `T | undefined`.

**UpdateAgentUseCase was intentionally LEFT UNTOUCHED** — it is a
partial-merge (`dto.X ?? existing.X`), not a default-drift case; applying A1
there would be wrong.

### 3.2 D1 — `better-auth@1.x` (DEFER to dedicated sprint) — NEXT UP

**Why not done yet:** SSOT says "1–2 days, Medium risk, schema migration + data
migration". Bigger blast radius than D2/D4.

**Replacement scope:** 8 use-cases (Register, Login, GoogleOAuth, VerifyEmail,
ResendVerification, ForgotPassword, ResetPassword, ChangePassword) + 4 routes
+ 4 Drizzle tables + custom JWT decorate + custom rate-limit + captcha/voucher
flows + custom email templates.

**Why I don't recommend jumping in cold:** custom logic that needs to be
re-architected onto Better Auth hooks (credit ledger entry on register,
voucher redemption, device enforcement, moneyDb pool, admin role + audit
log, custom rate-limit, captcha gate).

**To start D1:** first produce a *migration plan* doc (research-only,
no code change): schema diff, hook map, data migration script outline,
parallel-test strategy. Then user reviews before any rewrite.

### 3.3 Phase 5 / Wave 2B / Wave 3 backlog

| ID | File | Effort |
|----|------|--------|
| A1 | 8 use-cases (D4 above) | 2–3h |
| I1 | SSE parser dedupe (AiGateway + FxMacroData) | Med |
| W3 | 4 backfillers → 1 generic `Backfiller<Row>` | Med |
| P8 | errorHandler consolidation | Low |
| P11 | rate-limit Redis store 1 round-trip | Low–Med |
| P14 | 2nd redis client + heartbeat mget | Low |
| A3 | temperature ×100 encoding dedupe | Med (migration) |
| A4 | CSV escape helper | Low |
| A6 | credit settle-retry (keep but clarify) | — |
| I4 | legacy dual-read scaffolding | Low |
| W1 | retry helper | Low |
| W2 | month math into BrokerTimeCalculator | Low |
| W5 | indicator regex | Low |
| W6 | backoff helper | Low |
| W7 | daily budget class | Low |
| P13 | SSE budget → Redis native | Med |
| P16 | news relay watermark (replace unbounded Set) | Med |

---

## 4. Style + tech constraints (don't fight these)

- **TypeScript 7** — no `experimentalDecorators`, no `emitDecoratorMetadata`
  (so TSyringe/Inversify are OUT; awilix was the only option for D2).
- **TypeBox** is THE validation lib (already wired into Fastify via
  `@fastify/type-provider-typebox` + Ajv). Do NOT swap to Zod/Valibot/ArkType.
- **Drizzle** ORM (no Prisma). Postgres + `@upstash/redis` REST (no
  ioredis, no node-redis).
- **Pino** logger (no winston/bunyan). Shared instance in
  `packages/application/src/logger.ts`.
- **`@fastify/*` ecosystem** for plugins (jwt, cors, helmet, rate-limit,
  env, awilix, swagger). Don't introduce Express-style middlewares.
- **`fastify-plugin` (`fp`)** to opt plugins out of encapsulation when
  they need to share state across the app.

---

## 5. Build / test commands

```sh
cd Backend
pnpm -r build                   # tsc on all 7 packages — must PASS
pnpm --filter "@betrix/api" lint          # tsc --noEmit on api
pnpm --filter "@betrix/api" test          # vitest run (infra needs Docker)
docker compose -f docker-compose.dev.yml up -d   # for infra integration tests
```

---

## 6. Quick grep cheatsheet

```sh
# All `|| default` patterns that D4 should fix
rg "|| [0-9'\"]+\b" packages/application/src/use-cases

# All `Value.Decode` call sites (probably none today)
rg "Value\.(Decode|Cast|Parse)" packages/

# Container accessor (legacy `fastify.container` still works via decorate)
rg "fastify\.(container|diContainer)" apps/api/src/

# Untyped `any` casts
rg "as any" apps/api/src/ packages/
```

---

## 7. Reference

- **SSOT review (full):** `docs/backend-native-vs-complex-review.md` (277 lines)
- **Pre-D2 commit (what D2 replaced):** `30093be` (reverted) and the original
  798-line `container.plugin.ts` is preserved in git history (`999d6e5`).
- **Repo:** `git@github.com:armanmaulid/Betrix-Reborn.git` (origin)
