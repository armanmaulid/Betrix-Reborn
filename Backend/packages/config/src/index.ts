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
  DEFAULT_MODEL: Type.Optional(Type.String())
});

export type EnvConfig = Static<typeof EnvSchema>;

const isProduction = process.env.NODE_ENV === 'production';

// Fail fast: JWT_SECRET must be set and strong — never fall back to a known value.
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error(
    'JWT_SECRET must be set (min 32 chars) — refusing to start with a default secret'
  );
}

// Fail fast on missing CRITICAL infrastructure config. Dev-only fallbacks keep
// `docker-compose.dev.yml` ergonomics but must never silently mask a missing
// DATABASE_URL / Redis in production.
function requireEnv(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (isProduction) {
    throw new Error(
      `${name} is required in production — refusing to start with the dev fallback (${devFallback})`
    );
  }
  return devFallback;
}

// Resolve raw values first (dev fallbacks included), THEN validate — so the
// schema judges what the app will actually run with.
const resolvedEnv = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: requireEnv(
    'DATABASE_URL',
    'postgresql://betrix:betrixpass@localhost:5432/betrix_reborn'
  ),
  UPSTASH_REDIS_REST_URL: requireEnv('UPSTASH_REDIS_REST_URL', 'http://localhost:8079'),
  UPSTASH_REDIS_REST_TOKEN: requireEnv('UPSTASH_REDIS_REST_TOKEN', 'local_dev_token'),
  JWT_SECRET: jwtSecret,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  DEVICE_ENFORCEMENT: process.env.DEVICE_ENFORCEMENT !== 'false',
  BROKER_UTC_OFFSET: Number(process.env.BROKER_UTC_OFFSET) || 3,
  FINNHUB_LOG_TICKS: process.env.FINNHUB_LOG_TICKS === 'true',
  AI_BASE_URL: process.env.AI_BASE_URL,
  AI_API_KEY: process.env.AI_API_KEY,
  DEFAULT_MODEL: process.env.DEFAULT_MODEL
};

// Validate the resolved environment so malformed values (e.g. PORT=abc)
// surface at boot instead of deep inside request handling.
{
  const errors = Array.from(Value.Errors(EnvSchema, resolvedEnv));
  if (errors.length > 0) {
    const detail = errors.map((e) => `${e.path}: ${e.message}`).join('; ');
    throw new Error(`Invalid environment configuration → ${detail}`);
  }
}

export const env = {
  ...resolvedEnv,
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
  FXMACRODATA_API_KEY: process.env.FXMACRODATA_API_KEY || '',
  FXMACRODATA_RETRY_MAX_ATTEMPTS: Number(process.env.FXMACRODATA_RETRY_MAX_ATTEMPTS) || 3,
  FXMACRODATA_RETRY_BASE_DELAY_MS: Number(process.env.FXMACRODATA_RETRY_BASE_DELAY_MS) || 1000,
  FXMACRODATA_SSE_RECONNECT_DELAY_MS:
    Number(process.env.FXMACRODATA_SSE_RECONNECT_DELAY_MS) || 5000,
  // Value-refresh pass (CalendarWorker.refreshRecentValues): backfills Actual
  // for released events and re-pulls Forecast for upcoming ones even without a
  // paid SSE key. The call budget keeps the free tier (100 req/day) safe — a
  // tick with nothing to refresh makes zero HTTP calls.
  CALENDAR_REFRESH_CRON: process.env.CALENDAR_REFRESH_CRON || '*/30 * * * *',
  CALENDAR_REFRESH_LOOKBACK_HOURS: Number(process.env.CALENDAR_REFRESH_LOOKBACK_HOURS) || 72,
  CALENDAR_REFRESH_AHEAD_HOURS: Number(process.env.CALENDAR_REFRESH_AHEAD_HOURS) || 24,
  CALENDAR_REFRESH_MAX_CODES_PER_PASS: Number(process.env.CALENDAR_REFRESH_MAX_CODES_PER_PASS) || 8,
  FXMACRODATA_DAILY_CALL_BUDGET: Number(process.env.FXMACRODATA_DAILY_CALL_BUDGET) || 60,

  // Fase 1 (DB/Redis plan): read admin analytics token series from the
  // pre-aggregated usage_daily rollup instead of scanning chat_messages.
  USE_USAGE_DAILY: process.env.USE_USAGE_DAILY === 'true',

  // Billing token source: 'provider' prefers real upstream usage numbers when
  // the AI gateway reports them; 'estimate' forces the legacy chars/4 model.
  BILLING_SOURCE: process.env.BILLING_SOURCE || 'provider'
};
