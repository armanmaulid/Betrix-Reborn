# D1 — Better Auth Migration Plan (RESEARCH-ONLY)

**Date:** 2026-08-30
**Status:** Research complete (4 parallel research agents). **No code written.** Awaiting user go/no-go + scope decision.
**Stack:** Fastify 5 + Drizzle (Postgres) + TypeBox + `@fastify/jwt` + `pg` + `@upstash/redis`. TypeScript 7.
**Goal:** Replace the hand-rolled auth surface (8 use-cases, 4 routes, 4 Drizzle tables, custom JWT decorate, captcha/voucher/device/rate-limit flows) with Better Auth.

> This doc synthesizes 4 research streams:
> (A) Better Auth Fastify + Drizzle integration
> (B) Current auth codebase audit
> (C) Schema + production data migration
> (D) Custom logic → Better Auth hooks mapping

---

## 1. Executive Summary

| Dimension | Finding |
|---|---|
| **What Better Auth replaces natively** | credential register/login, password hashing, session table + token issuance/validation/revocation, Google OAuth, email verification, password reset/forgot, change-password, change-email, admin role/ban/impersonation, rate-limit bucket, third-party captcha, custom email templates |
| **What MUST stay custom** | credit ledger + atomic voucher redemption, 1:1 device binding (server-keyed), live ban/suspension + instant per-request revocation, audit log (`admin_actions`/`activity_logs`), SSE stream ticket, progressive brute-force + captcha escalation, `money` billing schema |
| **Risk** | Medium–High. Not a drop-in. ~8 use-cases + 4 routes deleted, but ~7 custom behaviors must be re-architected onto hooks/plugins. Schema migration + forced re-auth at cutover. |
| **Effort (research estimate)** | 1–2 days implementation + schema migration + data backfill script + soak window. Higher than SSOT's optimistic "1–2 days" because of the custom behaviors. |
| **Biggest gotchas** | (1) No official Fastify plugin — manual `auth.handler` bridge route; (2) `additionalFields` snake_case mapping needs explicit `fields` config (BA v1.3.24+ broke `fieldName`); (3) password hash override (keep bcrypt to avoid mass reset); (4) session cache vs our live ban check; (5) TypeScript 7 `$Infer` inference quirks. |

**Recommendation:** Proceed ONLY as a dedicated sprint with a flag-gated cutover (Phase 0→3 below). Do NOT delete the legacy auth code until the soak window passes.

---

## 2. Better Auth Integration (stream A)

- **No official `fastify` plugin.** Canonical pattern = catch-all `/api/auth/*` route bridging Fastify's Node request to Better Auth's Web-standard `Request`/`Response`:
  ```ts
  fastify.route({
    method: ['GET','POST'], url: '/api/auth/*',
    async handler(request, reply) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const req = new Request(url, {
        method: request.method,
        headers: fromNodeHeaders(request.headers),
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });
      const res = await auth.handler(req);
      reply.status(res.status);
      res.headers.forEach((v, k) => reply.header(k, v));
      return reply.send(res.body ? await res.text() : null);
    },
  });
  ```
  Sessions in routes: `auth.api.getSession({ headers: fromNodeHeaders(request.headers) })`.
- **Drizzle adapter:** `drizzleAdapter(db, { provider: 'pg', usePlural, camelCase, schema })`. Requires **4 core tables** with relations: `user`, `session`, `account`, `verification`. Custom columns via `user.additionalFields` / `session.additionalFields`; generate/migrate with `npx @better-auth/cli generate`.
- **Session model:** primarily **opaque cookie** (`session_token`) with server-side DB lookup — direct replacement for hand-rolled `@fastify/jwt` decorate. Optional `cookieCache` (compact/jwt/jwe) avoids DB hits. JWTs are NOT the default session; the `jwt()`/`bearer()` plugins issue JWTs for API clients separately.
- **Type-safety:** `auth.$Infer.Session` (server). Use `type Auth = ReturnType<typeof betterAuth<...>>; export const auth: Auth = ...` for strict inference. Set `exactOptionalPropertyTypes: false`.
- **Plugins:** `emailAndPassword`, `socialProviders.google`, `emailVerification`, `admin`, `rateLimit`, `twoFactor`, `organization`, `bearer`, `jwt`, `captcha`, `openAPI`.
- **Gotchas (Fastify + Drizzle + TS7):** forward `Set-Cookie` headers manually; `$Infer` + additionalFields historically omit fields (use `ReturnType` pattern); plugins add columns (run CLI generate or adapter throws "model not found"); set `trustedOrigins` + `@fastify/cors` `credentials: true`; keep Better Auth id generation (avoid `generateId:false` on MySQL).

---

## 3. Current Auth Surface Audit (stream B)

### 3.1 Use-case inventory
| Use-case | Deps injected | Side-effects |
|---|---|---|
| RegisterUseCase | userRepo, deviceRepo, verificationRepo, authService, emailSvc, activityLogRepo | insert user (credits=100), 1:1 device bind, verify token, send email, create session, activity log |
| LoginUseCase | userRepo, deviceRepo, loginAttemptRepo, authService, captchaSvc, activityLogRepo | record/clear failures, device upsert, create session, activity log |
| GoogleOAuthUseCase | userRepo, deviceRepo, authService, googleVerifier | insert/update user, device bind, session |
| VerifyEmailUseCase | userRepo, verificationRepo | update user, invalidate tokens |
| ResendVerificationUseCase | userRepo, verificationRepo, emailSvc | insert token, send email |
| ForgotPasswordUseCase | userRepo, verificationRepo, emailSvc | insert token, send email |
| ResetPasswordUseCase | userRepo, verificationRepo, sessionRepo, authService | update user, delete all sessions |
| ChangePasswordUseCase | userRepo, sessionRepo, authService | update user, revoke other sessions |
| ChangeEmailUseCase | userRepo, authService | update user (emailVerified=false) |
| GetStreamTicketUseCase | ticketStore (Redis) | Redis SET ticket→userId |
| RevokeSessionUseCase / LogoutAllUseCase | sessionRepo, activityLogRepo | delete session(s), activity log |

### 3.2 Routes
`POST /register`, `/login`, `/google`, `/verify-email`, `/resend-verification`, `/forgot-password`, `/reset-password`, `/stream-ticket`, `/logout`, `/logout-all` — most rate-limited 10/min. JWT signed via `fastify.jwt.sign({userId,sessionId,email,isAdmin})`; `authenticate` re-queries DB session (instant revocation) + `users.status` (live ban) on every request. Session tokens SHA-256 hashed at rest.

### 3.3 Tables
- **users**: id, email, password_hash, name, `is_admin`, `status` (active/suspended/banned), tier, email_verified, `credits`(def 100), `reserved_credits`, `reserved_until`, `google_id`, phone, address, birthdate, gender, bio, verified_at, last_active, created_at
- **sessions**: id, user_id FK, token (hash, unique), `device_fingerprint`, ip, user_agent, expires_at
- **devices**, **failed_login_attempts**, **verification_tokens** (`user_id, token, type, expires_at`), **notification_preferences**
- **money** schema (same DB): `credit_transactions`, `credit_vouchers` (reference `users.id`)

### 3.4 REPLACE vs KEEP
- **Natively covered:** credential register/login, password hashing, session table + JWT issuance, session validation/revocation, Google OAuth, email verification, password reset/forgot, change-password, change-email, ban/role plugins.
- **MUST keep custom:** credit ledger + atomic voucher redemption (single TX), 1:1 device binding (server-derived fingerprint, admin bypass, conflict rejection), live ban/suspension + instant per-request revocation, audit trail (`activity_logs` + `admin_actions`), SSE stream ticket, voucher issuance admin flow, PG pool metrics.
- **HARD to replicate:** server-derived 1:1 device binding; live ban + instant revocation (BA caches sessions); atomic cross-table voucher redemption in one TX; JWT continuity (existing 7-day client JWTs need cutover plan; BA supports custom hash verify).

---

## 4. Schema + Data Migration (stream C)

### 4.1 Schema diff
- **users:** KEEP all custom columns — extend in place. ADD `updatedAt` (default now), `image` (null). Declare `is_admin`, `status`, `tier`, `credits`, `reserved_credits`, `reserved_until`, `google_id`, `phone`, etc. via `user.additionalFields` + `user.fields` (snake_case) mapping. Do NOT rename.
- **sessions:** ADD `updatedAt`; map `ip`→`ipAddress`; keep `device_fingerprint` as additional field. Token length 512 OK.
- **account / verification:** CREATE new (we lack them).
- **KEEP SEPARATE** (BA ignores): `devices`, `failed_login_attempts`, `notification_preferences`, `credit_transactions`, `credit_vouchers`.

### 4.2 Data migration + risk
- **Passwords (highest risk):** current bcryptjs cost 12 in `password_hash`. Better Auth defaults to scrypt, but override `password:{hash,verify}` with bcryptjs cost 12 (reads cost from hash) → **no rehash needed**. Backfill: for each user INSERT an `account` row (`providerId='credential'`, `accountId`=email or id, `password`=existing bcrypt hash). Drop legacy `password_hash` only after cutover.
- **Sessions:** BA token format/columns incompatible → **invalidate all legacy sessions** (`DELETE FROM identity.sessions`), force re-login. Only user-visible impact; no DB downtime.
- **verification_tokens:** short-lived → drop, let BA recreate.
- **IDs:** KEEP existing uuid user IDs; set BA `generateId:'uuid'` so `account`/`session` FKs stay valid (avoids breaking `money` FKs).
- **moneyDb correction:** `DATABASE_URL_MONEY` does **not** exist as a separate pool — `money` is a Postgres **schema (namespace)** in the SAME database. One `Pool` from `DATABASE_URL`. BA uses one connection, can read/write both. Configure `schemaName`/search_path so BA sees `identity`/`money` schemas.

### 4.3 Recommended sequencing (zero-downtime)
1. **Phase 0 (online DDL):** add `updatedAt`/`image` to users, `updatedAt` to sessions, create `account`/`verification`, add FK-compatible uuid IDs. No behavior change.
2. **Phase 1 (backfill script):** populate `account.password` from `password_hash`; set `updatedAt`. Validate counts.
3. **Phase 2 (cutover, flag-gated):** route login/register/session through Better Auth with bcrypt override; on switch, invalidate legacy sessions.
4. **Phase 3 (cleanup):** monitor; after soak window remove old auth code paths + legacy `password_hash` column.

**Key risks:** (a) additionalFields snake_case mapping needs explicit `fields` config; (b) forced re-auth at cutover; (c) keep bcrypt to avoid mass password resets.

---

## 5. Custom Logic → Hooks Mapping (stream D)

| # | Our custom behavior | Better Auth mechanism | Effort | Risk / Notes |
|---|---|---|---|---|
| 1 | Credit ledger + atomic voucher redemption + reserve/settle | `databaseHooks.user.create.after` (grant 100) + custom `after` hook; keep `DrizzleCreditRepository` for atomic ledger. `credits`/`reservedCredits` as `additionalFields`. | High | BA has no ledger concept. Hook only reads/writes columns; keep transactional repo. |
| 2 | Device 1:1 binding (`DEVICE_ENFORCEMENT`, server fingerprint) | Custom `before`/`after` hooks on `/sign-up/email` & `/sign-in/email` calling `DrizzleDeviceRepository`; device table stays custom. | Medium | Bespoke (admin bypass, conflict-on-collision). BA has no device model. |
| 3 | `is_admin` + `admin_actions` audit log | Admin plugin for role/ban/impersonation (maps `is_admin`→`role:'admin'`); custom `after` hooks log to `DrizzleAdminActionRepository`. | Medium | Admin plugin covers role/ban; **audit log NOT provided** — keep custom. |
| 4 | Login brute-force rate-limit (progressive delay + captcha trigger) | BA `rateLimit` (global + `customRules` per path, Redis `customStorage`) for bucket. | Medium | BA limit is per-IP/path only — account-email progressive delay + captcha-gated escalation must remain custom `before` hook. |
| 5 | Captcha gate (`RedisCaptchaStore` math captcha) | Keep `RedisCaptchaStore` as custom `before` hook; OR adopt `captcha()` plugin (Turnstile) replacing math captcha. | Low/Med | BA captcha is third-party + always-on, no conditional/progressive support. |
| 6 | Money schema for credits | External only — our repos use the separate schema; BA unaware. | Low | Out of BA scope. |
| 7 | Custom HTML email (`SmtpEmailService`) | `emailVerification.sendVerificationEmail` + `emailAndPassword.sendResetPassword` custom fns calling `SmtpEmailService`. | Low | Native. Reuse existing send fns. |

**Summary:** Natively covered: email templates (#7), admin role/ban/impersonation (#3 partial), generic rate-limit bucket (#4 partial), third-party captcha (#5 alt). Require custom hook/plugin code: credit ledger (#1), device binding (#2), audit logging (#3), progressive brute-force + captcha escalation (#4/#5). Keep fully external: money schema (#6). Adopt a wrapper plugin (`credits`, `devices`, `admin-audit` repos injected) so BA owns the session while our Drizzle repos own money/device/audit integrity.

---

## 6. Recommended Execution Plan (if user approves)

1. **Phase 0 — Schema prep (online DDL):** add BA-required columns/tables; no behavior change. Write migration SQL.
2. **Phase 1 — Backfill script:** populate `account` from `password_hash` (bcrypt preserved); validate row counts.
3. **Phase 2 — Better Auth wiring (flag-gated `USE_BETTER_AUTH`):** catch-all `/api/auth/*` route, Drizzle adapter with `additionalFields`, bcrypt hash override, admin plugin, rate-limit, email hooks. Keep legacy routes live behind the flag.
   - **Slice 1 ✅ DONE (`c6d9564`):** `createAuth(db, opts)` full config (emailAndPassword bcrypt cost 12, google placeholder, `admin()` plugin, `rateLimit`, `trustedOrigins`, `user.additionalFields` mirroring identity.users). `betterAuth.plugin.ts` mounts BA handler at `/api/auth/*` only when `USE_BETTER_AUTH=true` (no-op otherwise). `auth.plugin.ts` `authenticate` resolves session via BA `getSession` when flag on, legacy JWT when off. **Slice 2 ✅ DONE (`466819f`):** `packages/infra/src/auth/hooks.ts` `buildBetterAuthHooks()` re-creates the 4 custom behaviors as BA-native hooks (device 1:1 binding on `identity.devices`, progressive captcha gate via `LoginPolicy` on `/sign-in/email`, credit default 100 via `additionalFields`, REGISTER/LOGIN audit into `ops.activity_logs`). Hook deps injected from the awilix cradle by `betterAuth.plugin.ts`.
4. **Phase 3 — Cutover:** flip flag; invalidate legacy sessions; route all auth through BA.
5. **Phase 4 — Soak + cleanup:** monitor; after soak, delete 8 use-cases + 4 routes + legacy JWT decorate; drop `password_hash`.

**Total effort:** ~1–2 days implementation + migration/backfill + soak. Higher than SSOT's optimistic estimate due to 7 custom behaviors requiring hook re-architecture.

---

## 7. Open Questions for User (decision needed before code)

1. **Scope:** Full cutover (delete legacy) vs parallel-run (flag-gated, keep both)? → Recommend flag-gated.
2. **Captcha:** keep our `RedisCaptchaStore` math captcha (progressive) or adopt BA `captcha()` (Turnstile, always-on)?
3. **Device binding:** re-implement 1:1 server-keyed binding as BA hooks, or relax to BA's native device tracking?
4. **JWT continuity:** force re-login at cutover (simplest) — acceptable? (BA sessions are cookie-based; existing 7-day JWT clients would need migration.)
5. **Downtime tolerance:** forced re-auth for all active sessions at cutover — OK?
6. **Sprint allocation:** D1 is a dedicated sprint (medium risk). Confirm timeline.

---

*Generated from 4 parallel research agents (Fastify integration, codebase audit, schema/data migration, hooks mapping). No code was written. Next step: user reviews §7 open questions, then a separate implementation sprint begins.*

---

## 8. Phase 3 Status (2026-08-30) — CUTOVER LIVE

- `USE_BETTER_AUTH` default flipped to **true** (`0578588`) → Better Auth is the
  LIVE auth path. Legacy 8 use-cases + `/api/v1/auth` routes kept as flag-gated
  fallback (set flag `false` to revert).
- `packages/infra/src/persistence/drizzle/d1-cutover-invalidate.ts` added; run
  `pnpm --filter @betrix/infra db:cutover:d1` to TRUNCATE `identity.sessions`
  + `identity.failed_login_attempts` (data-only, no schema change).
- All 6 open questions (§7) answered — see §7. Decisions: flag-gated parallel
  run, keep math captcha, 1:1 device hook, force re-login, forced re-auth OK,
  dedicated sprint.
- Build PASS (7 pkgs); application tests 28/28 PASS.

---

## 9. Phase 4 Status (2026-08-30) — D1 COMPLETE

Commit `77a17e4` executed Phase 4: all legacy auth use-cases + routes + AuthService + JWT decorate + legacy schemas + legacy-coupled tests deleted. Better Auth (`@fastify/better-auth`-equivalent catch-all) is the **only** auth path. Routes migrated `request.user.userId` → `request.authUser!.id`. Build PASS (7 pkgs), domain 44/44 PASS, api lint PASS. D1 cutover complete; soak + frontend switch to `/api/auth/*` are the remaining operational items.
