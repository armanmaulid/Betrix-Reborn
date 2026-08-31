import { Redis } from '@upstash/redis';

/**
 * U-2 — explicit env validation with dev-only localhost fallback.
 * In production (`NODE_ENV === 'production'`) require explicit url + token
 * args OR `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` env vars.
 * Throws a clear credentials error instead of the SDK's confusing URL-format
 * error. In dev/test: falls back to `http://localhost:8079` + `local_dev_token`
 * (matches docker-compose.dev.yml redis service).
 *
 * Callers that already pass `env.UPSTASH_REDIS_REST_URL` explicitly
 * (e.g. container.plugin.ts) are unaffected.
 */
export function createRedisClient(url?: string, token?: string): Redis {
  const restUrl = url ?? process.env.UPSTASH_REDIS_REST_URL;
  const restToken = token ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !restToken) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in production'
      );
    }
    // Dev/test fallback.
    return new Redis({
      url: restUrl ?? 'http://localhost:8079',
      token: restToken ?? 'local_dev_token'
    });
  }

  return new Redis({ url: restUrl, token: restToken });
}
