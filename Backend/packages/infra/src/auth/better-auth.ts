import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '@betrix/config';
import { bcrypt } from '../external/auth/bcrypt.js';
import { buildBetterAuthHooks, type BetterAuthHookDeps } from './hooks.js';
import type { DrizzleDb } from '../persistence/drizzle/client.js';
import * as authSchema from './schemas.js';

/**
 * Phase 2 Slice 1 — Better Auth instance config (flag-gated at the plugin
 * layer, see apps/api/src/plugins/better-auth.plugin.ts).
 *
 * This module owns the *native* BA surface only:
 *   - emailAndPassword (bcrypt cost 12 via packages/infra/src/external/auth/bcrypt.ts)
 *   - socialProviders.google (env placeholders, disabled until configured)
 *   - admin() plugin (role/ban/impersonation)
 *   - rateLimit (BA built-in, window/max from env)
 *   - trustedOrigins from CORS_ORIGIN
 *   - user.additionalFields mirroring identity.users
 *     (isAdmin, credits, tier, status) so the BA `user` row carries the same
 *     authoritative fields the legacy path reads.
 *
 * Slice 2 (deferred, separate phase) layers ON TOP of this config via BA
 * hooks: device 1:1 binding, progressive captcha, credit grant on signup, and
 * audit-log emission. Those are intentionally NOT wired here yet.
 *
 * The handler is mounted by `better-auth.plugin.ts` only when
 * `USE_BETTER_AUTH=true`. `BETTER_AUTH_SECRET` MUST be injected in production
 * (32+ chars); in dev we fall back to a stable dev marker so local runs work
 * without manual secret generation.
 */

export type BetterAuthInstance = ReturnType<typeof betterAuth>;

export function createAuth(
  db: DrizzleDb,
  opts?: { secret?: string; baseURL?: string; hooks?: BetterAuthHookDeps }
): BetterAuthInstance {
  const secret =
    opts?.secret ?? process.env.BETTER_AUTH_SECRET ?? 'dev-phase2-better-auth-secret-change-me';
  const baseURL = opts?.baseURL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

  const trustedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Slice 2 — custom hooks (device / captcha / credit / audit). Only attached
  // when the caller supplies the repositories (i.e. when mounted by
  // betterAuth.plugin.ts under USE_BETTER_AUTH=true).
  const slice2 = opts?.hooks ? buildBetterAuthHooks(opts.hooks) : undefined;

  const config: BetterAuthOptions = {
    database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
    baseURL,
    secret,
    emailAndPassword: {
      // autoSignIn:false so a successful sign-up does NOT auto-create a session
      // (legacy register flow separates register from login). This keeps
      // `user.create.after` = REGISTER audit and `session.create.after` = LOGIN
      // audit cleanly separated — no double logging.
      autoSignIn: false,
      enabled: true,
      minPasswordLength: 8,
      // Keep legacy bcrypt cost (12) so backfilled `account.password` hashes
      // (from identity.users.password_hash) verify without rehash at cutover.
      password: {
        hash: (password: string) => bcrypt.hash(password, 12),
        verify: ({ password, hash }: { password: string; hash: string }) =>
          bcrypt.compare(password, hash)
      }
    },
    socialProviders: {
      // Credentials are placeholders; Google OAuth is inert until both env
      // vars are set. BA tolerates missing secrets (provider simply errors on
      // use) so we do not fail construction in dev.
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? 'placeholder-google-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? 'placeholder-google-client-secret'
        // redirectURI is derived from baseURL by BA; override if needed.
      }
    },
    // Slice 2 — user.additionalFields mirrors identity.users so the BA `user`
    // row carries the same authoritative fields the legacy path reads.
    // B-1: `isAdmin` was removed — the BA admin() plugin does NOT consult
    // it (only reads `user.role`), and Q1 (parallel-run) + the absence of
    // any `auth.api.setRole/listUsers/banUser/...` callers mean the admin
    // plugin is dead weight. Legacy `userRepo.isAdmin` is the sole source
    // of truth (see apps/api/src/plugins/auth.plugin.ts:requireAdmin).
    user: {
      additionalFields: {
        credits: { type: 'number', defaultValue: 100, input: false },
        tier: { type: 'string', defaultValue: 'free', input: false },
        status: { type: 'string', defaultValue: 'active', input: false }
      }
    },
    // B-1: removed `admin()` plugin (no consumers; see comment above).
    plugins: [],
    rateLimit: {
      window: 60,
      max: Number(process.env.RATE_LIMIT_MAX) || 120,
      enabled: true,
      // B-4 — multi-instance prod: share the counter across pods by
      // persisting in the same Drizzle DB as the rest of `auth.*`. Without
      // this, each pod has its own (max/window) budget, multiplying the
      // effective limit by replica count and weakening brute-force defense.
      // `modelName` defaults to 'rateLimit' per BA 1.7.2 docs; set
      // explicitly so the table is grep-able in the Drizzle schema.
      storage: 'database',
      modelName: 'rateLimit'
    },
    trustedOrigins,
    ...(slice2 ? { databaseHooks: slice2.databaseHooks } : {}),
    ...(slice2 ? { hooks: slice2.hooks } : {}),
    advanced: {
      database: {
        generateId: () => crypto.randomUUID()
      },
      // B-3 — cookie config for cross-origin / Safari ITP compat.
      // In dev (http://localhost) the BA default is `secure: false`;
      // in prod (https) secure is required so Safari/Chrome accept
      // the session cookie. `sameSite: 'lax'` is BA's default and
      // keeps OAuth redirect flows working; if you ever embed BA in an
      // iframe on a different origin, switch to `'none'` and require
      // `secure: true` explicitly.
      useSecureCookies: env.NODE_ENV === 'production',
      defaultCookieAttributes: {
        secure: env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
      }
    }
  };

  return betterAuth(config);
}

/**
 * Phase 0 placeholder exported for backwards compatibility with the
 * example snippet in docs/D1-better-auth-migration-plan.md §4. Throws on
 * import-resolution because no `db` singleton exists yet (Phase 2 will
 * wire the container-resolved Drizzle instance here).
 *
 * Use `createAuth(db)` from the awilix container instead.
 */
export const auth = new Proxy(
  {},
  {
    get() {
      throw new Error(
        '[auth] Phase 0 placeholder — call `createAuth(db)` with a Drizzle instance from the container. Phase 2 will wire this singleton.'
      );
    }
  }
) as unknown as BetterAuthInstance;
