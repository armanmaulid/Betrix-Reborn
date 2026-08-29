import pino from 'pino';

/**
 * Shared application-layer logger. The API process configures its own
 * `pino-pretty` transport via Fastify's `LogController`; this standalone
 * instance is the structured fallback for use-cases/services that have no
 * access to `fastify.log`.
 */
export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
