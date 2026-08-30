import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import fastifyRateLimit from '@fastify/rate-limit';
import { env } from '@betrix/config';
import { createRedisClient, redisKeys } from '@betrix/infra';

/** Structural type — avoids importing @upstash/redis into the API app. */
type UpstashLike = ReturnType<typeof createRedisClient>;

/**
 * T2.2 — Redis-backed rate-limit store (R1 tier).
 *
 * Why: the default in-memory store multiplies the effective limit by replica
 * count (brute-force defense defeated) and resets on every deploy.
 *
 * Fail-open policy: if Redis errors, incr resolves with counter 0 so traffic
 * is NEVER blocked by an infrastructure outage; a throttled warning is logged
 * instead. RATELIMIT_BACKEND=memory keeps the old behavior explicitly.
 *
 * @fastify/rate-limit v11 expects a STORE CONSTRUCTOR (`new Store(globalParams)`)
 * with `incr(key, cb, timeWindow, max)` → cb(null, {current, ttl}) — not an
 * instance, and not a bare counter. This factory returns a class matching that
 * contract.
 */
function createRedisRateLimitStore(redis: UpstashLike, scope: string, onBackendError: () => void) {
  return class RedisRateLimitStore {
    incr(
      key: string,
      callback: (err: Error | null, res?: { current: number; ttl: number }) => void,
      timeWindow?: number
    ): void {
      const windowMs = timeWindow ?? 60000;
      const k = redisKeys.rateLimit(scope, key);
      redis
        .incr(k)
        .then(async (current: number) => {
          if (current === 1) {
            try {
              await redis.expire(k, Math.ceil(windowMs / 1000));
            } catch {
              // Expiry best-effort: worst case key lives until pruned.
            }
          }
          callback(null, { current, ttl: windowMs });
        })
        .catch(() => {
          onBackendError();
          // Fail-open: counter 0 can never exceed max.
          callback(null, { current: 0, ttl: 0 });
        });
    }

    child(): this {
      return this;
    }
  };
}

const rateLimitPluginCallback: FastifyPluginAsync = async (fastify) => {
  const backend = env.RATELIMIT_BACKEND || 'redis';
  const windowMs = env.RATE_LIMIT_WINDOW_MS || 60000;

  const baseOptions: Record<string, unknown> = {
    global: true,
    max: env.RATE_LIMIT_MAX || 120,
    timeWindow: windowMs,
    errorResponseBuilder: (request: FastifyRequest, context: { max: number; after: string }) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. You can send up to ${context.max} requests per ${context.after}. Please try again later.`,
        details: {
          retryAfter: context.after
        }
      }
    })
  };

  if (backend === 'redis') {
    const redis = createRedisClient();
    let lastWarnAt = 0;
    baseOptions.store = createRedisRateLimitStore(redis, 'global', () => {
      if (Date.now() - lastWarnAt > 300_000) {
        lastWarnAt = Date.now();
        fastify.log.warn('Rate-limit Redis backend erroring — failing open (memory-less).');
      }
    });
  } else {
    fastify.log.warn({ backend }, 'Rate limiter using IN-MEMORY backend (single-replica only).');
  }

  await fastify.register(fastifyRateLimit, baseOptions as never);

  // Credential endpoints (/login, /register, /forgot-password, /reset-password,
  // /resend-verification) get a tighter per-route bucket declared directly on
  // each route via `config.rateLimit` (see better-auth-plugin.ts / BA
  // rateLimit option) so the brute-force
  // defense can never silently vanish on a route rename.
};

export const rateLimitPlugin = fp(rateLimitPluginCallback, {
  name: 'rate-limit-plugin'
});
