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
 */
class RedisRateLimitStore {
  constructor(
    private readonly redis: UpstashLike,
    private readonly windowSec: number,
    private readonly scope: string,
    private readonly onBackendError: () => void
  ) {}

  incr(key: string, callback: (err: Error | null, counter?: number) => void): void {
    const k = redisKeys.rateLimit(this.scope, key);
    this.redis
      .incr(k)
      .then(async (current: number) => {
        if (current === 1) {
          try {
            await this.redis.expire(k, this.windowSec);
          } catch {
            // Expiry best-effort: worst case key lives until pruned.
          }
        }
        callback(null, current);
      })
      .catch((err: Error) => {
        this.onBackendError();
        // Fail-open: counter 0 can never exceed max.
        callback(null, 0);
      });
  }

  child(): RedisRateLimitStore {
    return this;
  }

  reset(key: string, callback?: (err?: Error) => void): void {
    this.redis
      .del(redisKeys.rateLimit(this.scope, key))
      .then(() => callback?.())
      .catch((err: Error) => callback?.(err));
  }
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
    baseOptions.store = new RedisRateLimitStore(redis, Math.ceil(windowMs / 1000), 'global', () => {
      if (Date.now() - lastWarnAt > 300_000) {
        lastWarnAt = Date.now();
        fastify.log.warn('Rate-limit Redis backend erroring — failing open (memory-less).');
      }
    });
  } else {
    fastify.log.warn({ backend }, 'Rate limiter using IN-MEMORY backend (single-replica only).');
  }

  await fastify.register(fastifyRateLimit, baseOptions as never);

  // Credential endpoints get a much tighter bucket so IP rotation is the only
  // way around brute-force defense — and one noisy consumer of public market
  // data can never lock everyone out of login (shared global bucket).
  const AUTH_RATE_LIMIT = { max: 10, timeWindow: '1 minute' } as const;
  // NOTE: onRoute sees the pre-prefix url ('/login'), hence the optional
  // 'auth/' segment in the pattern.
  const CREDENTIAL_ENDPOINT =
    /\/(auth\/)?(login|register|forgot-password|reset-password|resend-verification)$/;
  fastify.addHook('onRoute', (routeOptions) => {
    const url = routeOptions.url || '';
    if (CREDENTIAL_ENDPOINT.test(url)) {
      routeOptions.config = { ...routeOptions.config, rateLimit: { ...AUTH_RATE_LIMIT } };
    }
  });
};

export const rateLimitPlugin = fp(rateLimitPluginCallback, {
  name: 'rate-limit-plugin'
});
