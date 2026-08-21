import { Type, Static } from '@sinclair/typebox';
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
      dotenv.config({ path: envPath });
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
  BROKER_UTC_OFFSET: Type.Optional(Type.Number({ default: 3 })),
  FINNHUB_LOG_TICKS: Type.Optional(Type.Boolean({ default: false })),
  AI_BASE_URL: Type.Optional(Type.String()),
  AI_API_KEY: Type.Optional(Type.String()),
  DEFAULT_MODEL: Type.Optional(Type.String())
});

export type EnvConfig = Static<typeof EnvSchema>;

// Fail fast: JWT_SECRET must be set and strong — never fall back to a known value.
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set (min 32 chars) — refusing to start with a default secret');
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://betrix:betrixpass@localhost:5432/betrix_reborn',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || 'http://localhost:8079',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || 'local_dev_token',
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 120,
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  BROKER_UTC_OFFSET: Number(process.env.BROKER_UTC_OFFSET) || 3,
  FINNHUB_LOG_TICKS: process.env.FINNHUB_LOG_TICKS === 'true',
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  AI_BASE_URL: process.env.AI_BASE_URL || 'http://localhost:20128/v1',
  AI_API_KEY: process.env.AI_API_KEY || '',
  DEFAULT_MODEL: process.env.DEFAULT_MODEL || 'dahono/deepseek-v4-pro-0813',
  SMTP_HOST: process.env.SMTP_HOST || 'localhost',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'no-reply@betrix.io'
};
