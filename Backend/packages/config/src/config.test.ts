import { describe, it, expect } from 'vitest';
import { env, EnvSchema } from './index.js';

describe('Config Package', () => {
  it('should load default environment configurations', () => {
    expect(env.PORT).toBeDefined();
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.UPSTASH_REDIS_REST_URL).toBeDefined();
    expect(env.JWT_SECRET).toBeDefined();
  });

  it('should define a valid TypeBox schema for environment variables', () => {
    expect(EnvSchema).toBeDefined();
    expect(EnvSchema.type).toBe('object');
  });
});
