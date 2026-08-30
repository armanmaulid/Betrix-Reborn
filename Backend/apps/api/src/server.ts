import Fastify, { LogController } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { env } from '@betrix/config';
import {
  containerPlugin,
  authPlugin,
  errorHandlerPlugin,
  swaggerPlugin,
  rateLimitPlugin,
  corsHelmetPlugin,
  ssePlugin
} from './plugins/index.js';
import { v1Routes } from './routes/api/v1/index.js';

export async function createServer() {
  const isDev = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

  const app = Fastify({
    logController: new LogController({ disableRequestLogging: true }),
    logger: {
      level: env.LOG_LEVEL || 'info',
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname'
            }
          }
        : undefined
    },
    // TRUST_PROXY=true when running behind a trusted reverse proxy / BFF so
    // request.ip reflects X-Forwarded-For (correct rate-limit buckets and
    // server-side device fingerprints). Never enable when directly exposed.
    trustProxy: env.TRUST_PROXY
  }).withTypeProvider<TypeBoxTypeProvider>();

  // 1. Register Core Security & Infrastructure Plugins
  await app.register(corsHelmetPlugin);
  await app.register(rateLimitPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(ssePlugin);
  await app.register(containerPlugin);
  await app.register(authPlugin);
  await app.register(swaggerPlugin);

  // 2. Register API Routes
  await app.register(v1Routes, { prefix: '/api/v1' });

  // Compact per-request log line (replaces Fastify's verbose 8-line default).
  // Successful requests log at DEBUG so default INFO runs stay readable —
  // failures stay loud regardless of level.
  app.addHook('onResponse', (request, reply) => {
    const statusCode = reply.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'debug';
    request.log[level](
      { status: statusCode, ms: reply.elapsedTime },
      `${request.method} ${request.url}`
    );
  });

  // 3. Root Health Check Endpoint
  app.get('/health', async (request, reply) => {
    return reply.send({
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

// Lifecycle Management & Server Startup
export async function startServer() {
  const app = await createServer();

  // Graceful Shutdown Handler (ADR-41)
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, initiating graceful shutdown...`);
    try {
      // Fastify's close() waits for in-flight requests to drain, then runs
      // onClose hooks (SseHub.closeAll(), pgPool.end()) in registration
      // order. Any one of those can, in principle, hang — a request that
      // never completes, an onClose hook awaiting something that never
      // resolves. Racing against an explicit timeout turns a silent
      // indefinite hang (previously: nothing after "Received SIGINT..." in
      // the log, forcing a manual kill with no diagnostic) into a clear,
      // actionable log line naming which case happened, without changing
      // behavior at all when close() finishes normally and wins the race.
      const CLOSE_TIMEOUT_MS = 10_000;
      const closeTimeout = new Promise<'timeout'>((resolve) =>
        setTimeout(() => resolve('timeout'), CLOSE_TIMEOUT_MS)
      );
      const result = await Promise.race([app.close().then(() => 'closed' as const), closeTimeout]);

      if (result === 'timeout') {
        app.log.error(
          `app.close() did not resolve within ${CLOSE_TIMEOUT_MS}ms — an in-flight request or an onClose hook (SseHub.closeAll, pgPool.end) is likely hanging. Forcing exit(1) rather than blocking forever; this needs investigating.`
        );
        process.exit(1);
      }

      app.log.info('Server successfully closed.');
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Log unhandled rejections instead of letting them crash the loop silently;
  // a genuinely broken state still triggers graceful shutdown on throw.
  process.on('unhandledRejection', (reason) => {
    app.log.error({ err: reason }, 'Unhandled promise rejection in API process');
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`🚀 Betrix-Reborn Fastify 5 API listening on http://${env.HOST}:${env.PORT}`);
    app.log.info(`📚 Swagger UI documentation available at http://${env.HOST}:${env.PORT}/docs`);
    return app;
  } catch (err) {
    if ((err as { code?: string }).code === 'EADDRINUSE') {
      app.log.error(
        `Port ${env.PORT} already in use. Stop the old process (kill <pid> / taskkill on Windows) then restart.`
      );
    } else {
      app.log.error(err);
    }
    process.exit(1);
  }
}

if (process.env.VITEST !== 'true') {
  startServer().catch((err) => {
    console.error('Fatal server start error:', err);
    process.exit(1);
  });
}
