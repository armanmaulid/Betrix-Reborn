import type { FastifyPluginAsync } from 'fastify';
import fastifyEnv from '@fastify/env';
import fp from 'fastify-plugin';
import { EnvSchema, env, type EnvConfig } from '@betrix/config';

/**
 * D3 — Single env-validation pipeline for the API process.
 *
 * `@betrix/config` already validates the *core* EnvSchema at import time
 * (see `Value.Parse` + the dev-fallback input builder in `packages/config`).
 * This plugin re-uses the same JSON Schema to expose the validated env as
 * `fastify.config` (typed via `FastifyInstance.config: EnvConfig`) so route
 * handlers can read config without an extra `import { env } from '@betrix/config'`.
 *
 * We pass `data: <EnvSchema subset from the already-validated env>` to
 * skip a second Ajv validation pass (the values are already coerced/typed
 * by `Value.Parse`) while still letting `@fastify/env` decorate the instance.
 */
const envPluginCallback: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyEnv, {
    schema: EnvSchema,
    data: {
      NODE_ENV: env.NODE_ENV,
      PORT: env.PORT,
      HOST: env.HOST,
      DATABASE_URL: env.DATABASE_URL,
      UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
      JWT_SECRET: env.JWT_SECRET,
      LOG_LEVEL: env.LOG_LEVEL,
      DEVICE_ENFORCEMENT: env.DEVICE_ENFORCEMENT,
      BROKER_UTC_OFFSET: env.BROKER_UTC_OFFSET,
      FINNHUB_LOG_TICKS: env.FINNHUB_LOG_TICKS,
      AI_BASE_URL: env.AI_BASE_URL,
      AI_API_KEY: env.AI_API_KEY,
      DEFAULT_MODEL: env.DEFAULT_MODEL
    } as Record<string, unknown>,
    // We use the existing `loadEnvFile()` in @betrix/config rather than
    // @fastify/env's own dotenv loader, so the API and worker share the
    // exact same `.env` resolution path.
    dotenv: false
  });
};

export const envPlugin = fp(envPluginCallback, { name: 'env-plugin' });

declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
  }
}
