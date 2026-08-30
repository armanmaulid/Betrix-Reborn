import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { DrizzleDb } from '../persistence/drizzle/client.js';
import * as authSchema from './schemas.js';

/**
 * Phase 0 — Better Auth instance stub.
 *
 * Phase 2 will add:
 *   - emailAndPassword (with bcrypt hash override from packages/infra/src/external/auth/bcrypt.ts)
 *   - socialProviders.google
 *   - emailVerification (SmtpEmailService hooks)
 *   - admin plugin
 *   - rateLimit (Redis customStorage)
 *   - custom hooks for device / captcha / credit / audit
 *   - user.additionalFields (isAdmin, credits, tier, status, etc.)
 *
 * Phase 0 only validates that the schema + adapter imports compile. The
 * returned `auth.handler` is intentionally NOT mounted by `apps/api` — the
 * legacy `auth.plugin.ts` remains the live auth surface until Phase 2
 * flips the `USE_BETTER_AUTH` flag.
 *
 * `BETTER_AUTH_SECRET` is a placeholder for Phase 1. Production deployments
 * must inject it via env (32+ chars). Defaults to a dev marker so missing
 * config is loud in the logs but does not throw at construction time.
 */

export type BetterAuthInstance = ReturnType<typeof betterAuth>;

export function createAuth(db: DrizzleDb): BetterAuthInstance {
  const config: BetterAuthOptions = {
    database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    secret: process.env.BETTER_AUTH_SECRET || 'phase0-placeholder-replace-in-phase1',
    advanced: {
      database: {
        generateId: () => crypto.randomUUID()
      }
    }
  };

  // Phase 2 additions (commented for reference):
  // emailAndPassword: {
  //   enabled: true,
  //   requireEmailVerification: true,
  //   password: {
  //     hash: (pw: string) => bcrypt.hash(pw, 12),
  //     verify: ({ password, hash }: { password: string; hash: string }) =>
  //       bcrypt.compare(password, hash)
  //   }
  // },
  // socialProviders: {
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID!,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!
  //   }
  // },
  // emailVerification: {
  //   sendVerificationEmail: async ({ user: u, url }) =>
  //     smtpEmailService.sendVerificationEmail({ to: u.email, link: url, name: u.name })
  // },
  // admin: {},
  // rateLimit: { window: 60, max: 10, customStorage: redisRateLimitStorage },
  // user: {
  //   additionalFields: {
  //     isAdmin: { type: 'boolean', defaultValue: false, input: false },
  //     credits: { type: 'number', defaultValue: 100, input: false },
  //     tier: { type: 'string', defaultValue: 'free', input: false },
  //     status: { type: 'string', defaultValue: 'active', input: false }
  //   }
  // },
  // trustedOrigins: ['http://localhost:3000']

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