import { APIError } from 'better-auth';
import { env } from '@betrix/config';
import { ConflictError, hashString } from '@betrix/core';
import type {
  IDeviceRepository,
  ILoginAttemptRepository,
  IActivityLogRepository
} from '@betrix/domain';
import { LoginPolicy } from '@betrix/domain';

/**
 * D1 Phase 2 Slice 2 — Better Auth hooks that re-create the 4 custom auth
 * behaviors the legacy 8 use-cases implemented, now as BA-native hooks:
 *
 *   1. Device binding (1:1 server-keyed, ADR-05)
 *   2. Progressive captcha gate (RedisCaptchaStore + LoginPolicy)
 *   3. Credit grant on signup (column default 100, NO ledger row)
 *   4. Audit log (ops.activity_logs: REGISTER / LOGIN)
 *
 * These run ONLY when the BA instance is mounted (USE_BETTER_AUTH=true).
 * They write to the SAME `identity.*` / `ops.*` tables the legacy code uses,
 * so the two auth surfaces stay consistent during the parallel-run window.
 *
 * Wiring notes:
 *   - `autoSignIn: false` (set in better-auth.ts) keeps registration from
 *     auto-creating a session, so `user.create.after` = REGISTER and
 *     `session.create.after` = LOGIN (no double audit).
 *   - Credits are granted via the `user.additionalFields` defaultValue (100)
 *     and NOT via CreditRepository, exactly mirroring legacy RegisterUseCase
 *     (which also wrote no ledger row).
 *
 * NOTE: this module deliberately does NOT import `@betrix/application`
 * (that would be a circular edge — application already depends on infra).
 * `CaptchaService` is consumed structurally, and the server-side device
 * fingerprint is derived inline (mirroring DeviceFingerprint.fromRequest:
 * sha256(ip | ua), same as core's generateDeviceFingerprint).
 */

export interface BetterAuthHookDeps {
  deviceRepo: IDeviceRepository;
  loginAttemptRepo: ILoginAttemptRepository;
  activityLogRepo: IActivityLogRepository;
  /** Structural subset of CaptchaService used by the captcha gate. */
  captchaService: {
    generateChallenge(
      ttlSeconds?: number
    ): Promise<{ id: string; question: string; expiresInSeconds: number }>;
    verify(challengeId: string, answer: string): Promise<boolean>;
  };
}

function clientIpAndUa(ctx: { headers?: Record<string, any> }): {
  ip?: string;
  userAgent?: string;
} {
  const h = ctx.headers ?? {};
  const xff = h['x-forwarded-for'];
  const ip =
    (typeof xff === 'string' && xff.split(',')[0].trim()) ||
    (typeof h['x-real-ip'] === 'string' && h['x-real-ip']) ||
    undefined;
  const userAgent = typeof h['user-agent'] === 'string' ? h['user-agent'] : undefined;
  return { ip, userAgent };
}

/** ADR-05 server-keyed fingerprint: sha256(normalizedIp | normalizedUa). */
function serverFingerprint(ip?: string, userAgent?: string): string {
  const normalizedIp = (ip ?? '').replace(/^::ffff:/, '').trim();
  const normalizedUa = (userAgent ?? '').trim().toLowerCase();
  return hashString(`${normalizedIp}|${normalizedUa}`);
}

function captchaRequiredError(captchaService: BetterAuthHookDeps['captchaService']): APIError {
  const challenge = captchaService.generateChallenge();
  return new APIError(428, {
    message: 'CAPTCHA verification required due to recent failed login attempts.',
    body: { code: 'CAPTCHA_REQUIRED', captcha: challenge }
  });
}

/**
 * Builds the BA `databaseHooks` + `hooks` objects. Returned objects are
 * spread into the Better Auth config by `createAuth`.
 */
export function buildBetterAuthHooks(deps: BetterAuthHookDeps) {
  const { deviceRepo, loginAttemptRepo, activityLogRepo, captchaService } = deps;

  // 1 + 3 + 4 — registration side effects (device bind, no ledger credit,
  // REGISTER audit). Credits come from additionalFields defaultValue.
  const userDatabaseHooks = {
    create: {
      after: async (user: { id: string; email?: string } & Record<string, unknown>, ctx: any) => {
        const { ip, userAgent } = clientIpAndUa(ctx?.context ?? ctx ?? {});
        try {
          if (env.DEVICE_ENFORCEMENT) {
            const fp = serverFingerprint(ip, userAgent);
            const existing = await deviceRepo.findByFingerprint(fp);
            if (existing && existing.userId !== user.id) {
              throw new ConflictError(
                'This physical device is already bound to an existing account.'
              );
            }
            if (!existing) {
              await deviceRepo.save({
                id: crypto.randomUUID(),
                userId: user.id,
                fingerprint: fp,
                lastSeenAt: new Date(),
                createdAt: new Date()
              } as any);
            }
          }
        } catch (err) {
          if (err instanceof ConflictError) throw err;
          // Device binding is best-effort at register; don't fail the account.
        }
        await activityLogRepo
          .log(user.id, 'REGISTER', { email: user.email }, ip, userAgent)
          .catch(() => {});
      }
    }
  };

  // 1 + 4 — login side effects (1:1 device enforce, updateLastSeen, LOGIN audit).
  const sessionDatabaseHooks = {
    create: {
      after: async (session: { userId: string } & Record<string, unknown>, ctx: any) => {
        const { ip, userAgent } = clientIpAndUa(ctx?.context ?? ctx ?? {});
        const email = String((ctx?.body as any)?.email ?? '');
        try {
          if (env.DEVICE_ENFORCEMENT) {
            const fp = serverFingerprint(ip, userAgent);
            const existing = await deviceRepo.findByFingerprint(fp);
            if (existing && existing.userId !== session.userId) {
              throw new ConflictError(
                'This physical device is already associated with another account.'
              );
            }
            await deviceRepo.updateLastSeen(fp);
          }
        } catch (err) {
          if (err instanceof ConflictError) throw err;
        }
        if (email) await loginAttemptRepo.clearFailedLogins(email).catch(() => {});
        await activityLogRepo
          .log(session.userId, 'LOGIN', { method: 'password' }, ip, userAgent)
          .catch(() => {});
      }
    }
  };

  // 2 — progressive captcha gate on email sign-in.
  const hooks = {
    before: async (ctx: any) => {
      if (ctx?.path !== '/sign-in/email') return;
      const body = (ctx.body ?? {}) as {
        email?: string;
        captchaId?: string;
        captchaAnswer?: string;
      };
      const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
      if (!email) return;

      const { ip } = clientIpAndUa(ctx);
      const recentFailures = await loginAttemptRepo.countRecentFailures(email, 15);
      const requiresCaptcha = LoginPolicy.requiresCaptcha(recentFailures);

      if (requiresCaptcha) {
        if (!body.captchaId || !body.captchaAnswer) {
          throw captchaRequiredError(captchaService);
        }
        const ok = await captchaService.verify(body.captchaId, body.captchaAnswer);
        if (!ok) {
          await loginAttemptRepo.recordFailedLogin(email, ip).catch(() => {});
          throw captchaRequiredError(captchaService);
        }
      }

      const delayMs = LoginPolicy.calculateDelayMs(recentFailures);
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  };

  return { databaseHooks: { user: userDatabaseHooks, session: sessionDatabaseHooks }, hooks };
}
