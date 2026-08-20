import { Redis } from '@upstash/redis';

export function createRedisClient(url?: string, token?: string): Redis {
  const restUrl = url || process.env.UPSTASH_REDIS_REST_URL || 'http://localhost:8079';
  const restToken = token || process.env.UPSTASH_REDIS_REST_TOKEN || 'local_dev_token';

  return new Redis({
    url: restUrl,
    token: restToken
  });
}
