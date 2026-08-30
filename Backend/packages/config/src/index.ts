import { Type, Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

function loadEnvFile() {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env')
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, quiet: true });
      break;
    }
  }
}

loadEnvFile();

/**
 * Canonical schema for the *core* infrastructure env vars — the ones the API
 * needs at boot to bind a port, open a DB pool, sign JWTs, and emit logs.
 *
 * USE_BETTER_AUTH: D1 cutover lever. When `true`, `apps/api` routes auth
 * through Better Auth; legacy 8 use-cases + JWT decorate stay live behind
 * the flag for debug. Default `false` until Phase 2 cutover.
 */
export const EnvSchema = Type.Object({
  NODE_ENV: Type.Optional(Type.String({ default: 'development' })),
  PORT: Type.Optional(Type.Number({ default: 3000 })),
  HOST: Type.Optional(Type.String({ default: '0.0.0.0' })),
  DATABASE_URL: Type.String(),
  UPSTASH_REDIS_REST_URL: Type.String(),
  UPSTASH_REDIS_REST_TOKEN: Type.String(),
  JWT_SECRET: Type.String({ minLength: 32 }),
  LOG_LEVEL: Type.Optional(Type.String({ default: 'info' })),
  DEVICE_ENFORCEMENT: Type.Optional(Type.Boolean({ default: true })),
  BROKER_UTC_OFFSET: Type.Optional(Type.Number({ default: 3 })),
  FINNHUB_LOG_TICKS: Type.Optional(Type.Boolean({ default: false })),
  AI_BASE_URL: Type.Optional(Type.String()),
  AI_API_KEY: Type.Optional(Type.String()),
  DEFAULT_MODEL: Type.Optional(Type.String()),
  // Phase 3 cutover — D1 Better Auth is now the LIVE auth path. Legacy 8
  // use-cases + /api/v1/auth routes remain in code (flag-gated fallback) but
  // are superseded. Set to `false` to revert to the legacy JWT path.
  USE_BETTER_AUTH: Type.Optional(Type.Boolean({ default: true })),
  BETTER_AUTH_SECRET: Type.Optional(Type.String()),
  BETTER_AUTH_URL: Type.Optional(Type.String())
});

export type EnvConfig = Static<typeof EnvSchema>;

/**
 * Runtime-resolved type of the core env block. Differs from `EnvConfig` in
 * that fields with `default` are typed as `T` (not `T | undefined`),
 * because `Value.Parse` guarantees they're always populated after defaults
 * are applied.
 */
type ResolvedCoreEnv = {
  NODE_ENV: string;
  PORT: number;
  HOST: string;
  DATABASE_URL: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  JWT_SECRET: string;
  LOG_LEVEL: string;
  DEVICE_ENFORCEMENT: boolean;
  BROKER_UTC_OFFSET: number;
  FINNHUB_LOG_TICKS: boolean;
  AI_BASE_URL: string | undefined;
  AI_API_KEY: string | undefined;
  DEFAULT_MODEL: string | undefined;
  USE_BETTER_AUTH: boolean;
  BETTER_AUTH_SECRET: string | undefined;
  BETTER_AUTH_URL: string | undefined;
};

const isProduction = process.env.NODE_ENV === 'production';

function buildInput(): Record<string, unknown> {
  const input: Record<string, unknown> = { ...process.env };
  if (!isProduction) {
    input.DATABASE_URL ??= 'postgresql://betrix:betrixpass@localhost:5432/betrix_reborn';
    input.UPSTASH_REDIS_REST_URL ??= 'http://localhost:8079';
    input.UPSTASH_REDIS_REST_TOKEN ??= 'local_dev_token';
  }
  return input;
}

/**
 * D3 — replaces the hand-rolled `resolvedEnv` object + the manual JWT-secret
 * length check + the `requireEnv` helper. `Value.Parse` is TypeBox's combined
 * `Default` + `Check` + `Cast`:
 *   C1 fix: schema `default` values are applied.
 *   C2 fix: `Type.Number` coerces string env to number.
 */
const parsed = Value.Parse(EnvSchema, buildInput());

export const env = {
  ...(parsed as unknown as ResolvedCoreEnv),
  USE_BETTER_AUTH: parsed.USE_BETTER_AUTH ?? false,
  BETTER_AUTH_SECRET: parsed.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: parsed.BETTER_AUTH_URL,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 120,
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  TRUST_PROXY: process.env.TRUST_PROXY === 'true',
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY || '',
  FINNHUB_TIMEOUT_MS: Number(process.env.FINNHUB_TIMEOUT_MS) || 10000,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  AI_BASE_URL: process.env.AI_BASE_URL || 'http://localhost:20128/v1',
  AI_API_KEY: process.env.AI_API_KEY || '',
  DEFAULT_MODEL: process.env.DEFAULT_MODEL || 'dahono/deepseek-v4-pro-0813',
  SMTP_HOST: process.env.SMTP_HOST || 'localhost',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'no-reply@betrix.io',
  FXMACRODATA_BASE_URL: process.env.FXMACRODATA_BASE_URL || 'https://api.fxmacrodata.com',
  FXMACRODATA_CALENDAR_CURRENCY: process.env.FXMACRODATA_CALENDAR_CURRENCY || 'usd',
  FXMACRODATA_CALENDAR_CURRENCIES: process.env.FXMACRODATA_CALENDAR_CURRENCIES
    ? process.env.FXMACRODATA_CALENDAR_CURRENCIES.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined,
  FXMACRODATA_API_KEY: process.env.FXMACRODATA_API_KEY || '',
  FXMACRODATA_RETRY_MAX_ATTEMPTS: Number(process.env.FXMACRODATA_RETRY_MAX_ATTEMPTS) || 3,
  FXMACRODATA_RETRY_BASE_DELAY_MS: Number(process.env.FXMACRODATA_RETRY_BASE_DELAY_MS) || 1000,
  FXMACRODATA_SSE_RECONNECT_DELAY_MS:
    Number(process.env.FXMACRODATA_SSE_RECONNECT_DELAY_MS) || 5000,
  CALENDAR_REFRESH_CRON: process.env.CALENDAR_REFRESH_CRON || '*/30 * * * *',
  CALENDAR_REFRESH_LOOKBACK_HOURS: Number(process.env.CALENDAR_REFRESH_LOOKBACK_HOURS) || 72,
  CALENDAR_REFRESH_AHEAD_HOURS: Number(process.env.CALENDAR_REFRESH_AHEAD_HOURS) || 24,
  CALENDAR_REFRESH_MAX_CODES_PER_PASS: Number(process.env.CALENDAR_REFRESH_MAX_CODES_PER_PASS) || 8,
  FXMACRODATA_DAILY_CALL_BUDGET: Number(process.env.FXMACRODATA_DAILY_CALL_BUDGET) || 60,
  USE_USAGE_DAILY: process.env.USE_USAGE_DAILY === 'true',
  BILLING_SOURCE: process.env.BILLING_SOURCE || 'provider',
  CALENDAR_SEED_MIN_GAP_HOURS: Number(process.env.CALENDAR_SEED_MIN_GAP_HOURS) || 12,
  WORKER_LEASE_TTL_MS: Number(process.env.WORKER_LEASE_TTL_MS) || 90000,
  OPS_SOURCE: process.env.OPS_SOURCE || 'cache',
  OPS_AGGREGATOR_INTERVAL_MS: Number(process.env.OPS_AGGREGATOR_INTERVAL_MS) || 60000,
  DATABASE_URL_MONEY: process.env.DATABASE_URL_MONEY || process.env.DATABASE_URL || '',
  RATELIMIT_BACKEND: process.env.RATELIMIT_BACKEND || 'redis',
  MARKET_TICKER_INTERVAL_MS: Number(process.env.MARKET_TICKER_INTERVAL_MS) || 5000,
  REDIS_DAILY_BUDGET: Number(process.env.REDIS_DAILY_BUDGET) || 6000,
  PRICE_STALE_MS: Number(process.env.PRICE_STALE_MS) || 120000
};
