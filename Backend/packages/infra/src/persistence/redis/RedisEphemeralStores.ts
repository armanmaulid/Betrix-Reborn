import { Redis } from '@upstash/redis';
import { ICaptchaStore, IOAuthCodeStore, IStreamTicketStore, Nullable } from '@betrix/domain';

export class RedisCaptchaStore implements ICaptchaStore {
  private static readonly PREFIX = 'auth:captcha:';

  constructor(private readonly redis: Redis) {}

  async save(challengeId: string, answer: string, ttlSeconds: number = 300): Promise<void> {
    await this.redis.set(`${RedisCaptchaStore.PREFIX}${challengeId}`, answer.trim(), {
      ex: ttlSeconds
    });
  }

  async getAndDelete(challengeId: string): Promise<Nullable<string>> {
    const key = `${RedisCaptchaStore.PREFIX}${challengeId}`;
    const value = await this.redis.get<string>(key);
    if (value !== null && value !== undefined) {
      await this.redis.del(key);
      return String(value);
    }
    return null;
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
    const key = `${RedisOAuthCodeStore.PREFIX}${code}`;
    const value = await this.redis.get<string>(key);
    if (value !== null && value !== undefined) {
      await this.redis.del(key);
      return String(value);
    }
    return null;
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
    const key = `${RedisStreamTicketStore.PREFIX}${ticket}`;
    const value = await this.redis.get<string>(key);
    if (value !== null && value !== undefined) {
      await this.redis.del(key);
      return String(value);
    }
    return null;
  }
}
