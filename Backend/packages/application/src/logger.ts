import pino from 'pino';
import { env } from '@betrix/config';

/**
 * Shared application-layer logger. The API process configures its own
 * `pino-pretty` transport via Fastify's `LogController`; this standalone
 * instance is the structured fallback for use-cases/services that have no
 * access to `fastify.log`.
 *
 * T-6 — `pino-pretty` is a dev dep and is only attached in dev/test
 * (NODE_ENV !== 'production'). In production we emit structured JSON only;
 * `pino-pretty` is never required, never `require`-d.
 */
export const logger = pino({
  level: env.LOG_LEVEL || 'info',
  ...(env.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss Z' }
        }
      }
    : {})
});
