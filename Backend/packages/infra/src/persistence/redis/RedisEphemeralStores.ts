import { Redis } from '@upstash/redis';
import { ICaptchaStore, IStreamTicketStore, Nullable } from '@betrix/domain';
import { redisKeys } from './redis-keys.js';

/**
 * T2.3 — dual-read migration window: reads try the NEW namespaced key first,
 * falling back to the pre-cutover legacy key so in-flight challenges/tickets
// survive a deploy. Writes ALWAYS target the new key. Delete the legacy
// fallbacks one release after the cutover ships everywhere.
 */
const DUAL_READ_LEGACY = true;

async function consumeAtomic(redis: Redis, key: string): Promise<Nullable<string>> {
  const value = await redis.getdel<string>(key);
  return value === null || value === undefined ? null : String(value);
}

export class RedisCaptchaStore implements ICaptchaStore {
  constructor(private readonly redis: Redis) {}

  async save(challengeId: string, answer: string, ttlSeconds: number = 300): Promise<void> {
    await this.redis.set(redisKeys.captcha(challengeId), answer.trim(), {
      ex: ttlSeconds
    });
  }

  async getAndDelete(challengeId: string): Promise<Nullable<string>> {
    const fresh = await consumeAtomic(this.redis, redisKeys.captcha(challengeId));
    if (fresh !== null) return fresh;
    if (!DUAL_READ_LEGACY) return null;
    return consumeAtomic(this.redis, redisKeys.captchaLegacy(challengeId));
  }
}

export class RedisStreamTicketStore implements IStreamTicketStore {
  constructor(private readonly redis: Redis) {}

  async save(ticket: string, userId: string, ttlSeconds: number = 60): Promise<void> {
    await this.redis.set(redisKeys.streamTicket(ticket), userId, {
      ex: ttlSeconds
    });
  }

  async getAndDelete(ticket: string): Promise<Nullable<string>> {
    const fresh = await consumeAtomic(this.redis, redisKeys.streamTicket(ticket));
    if (fresh !== null) return fresh;
    if (!DUAL_READ_LEGACY) return null;
    return consumeAtomic(this.redis, redisKeys.streamTicketLegacy(ticket));
  }
}
