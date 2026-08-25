import { Redis } from '@upstash/redis';
import { ICaptchaStore, IOAuthCodeStore, IStreamTicketStore, Nullable } from '@betrix/domain';

/**
 * Atomic single-use consume: GETDEL removes the key and returns its value in
 * ONE server-side operation, so two concurrent requests presenting the same
 * ticket/captcha/oauth-code can never both read it before either deletes it
 * (the GET→DELETE race that broke the single-use invariant).
 * Upstash REST supports the GETDEL command natively.
 */
async function consumeAtomic(redis: Redis, key: string): Promise<Nullable<string>> {
  const value = await redis.getdel<string>(key);
  return value === null || value === undefined ? null : String(value);
}

export class RedisCaptchaStore implements ICaptchaStore {
  private static readonly PREFIX = 'auth:captcha:';

  constructor(private readonly redis: Redis) {}

  async save(challengeId: string, answer: string, ttlSeconds: number = 300): Promise<void> {
    await this.redis.set(`${RedisCaptchaStore.PREFIX}${challengeId}`, answer.trim(), {
      ex: ttlSeconds
    });
  }

  async getAndDelete(challengeId: string): Promise<Nullable<string>> {
    return consumeAtomic(this.redis, `${RedisCaptchaStore.PREFIX}${challengeId}`);
  }
}

export class RedisOAuthCodeStore implements IOAuthCodeStore {
  private static readonly PREFIX = 'auth:oauth_code:';

  constructor(private readonly redis: Redis) {}

  async save(code: string, userId: string, ttlSeconds: number = 300): Promise<void> {
    await this.redis.set(`${RedisOAuthCodeStore.PREFIX}${code}`, userId, {
      ex: ttlSeconds
    });
  }

  async getAndDelete(code: string): Promise<Nullable<string>> {
    return consumeAtomic(this.redis, `${RedisOAuthCodeStore.PREFIX}${code}`);
  }
}

export class RedisStreamTicketStore implements IStreamTicketStore {
  private static readonly PREFIX = 'auth:stream_ticket:';

  constructor(private readonly redis: Redis) {}

  async save(ticket: string, userId: string, ttlSeconds: number = 60): Promise<void> {
    await this.redis.set(`${RedisStreamTicketStore.PREFIX}${ticket}`, userId, {
      ex: ttlSeconds
    });
  }

  async getAndDelete(ticket: string): Promise<Nullable<string>> {
    return consumeAtomic(this.redis, `${RedisStreamTicketStore.PREFIX}${ticket}`);
  }
}
