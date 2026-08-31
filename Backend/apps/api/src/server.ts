import Fastify, { LogController, type FastifyRequest, type FastifyReply } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { env } from '@betrix/config';
import {
  containerPlugin,
  betterAuthPlugin,
  authPlugin,
  errorHandlerPlugin,
  swaggerPlugin,
  rateLimitPlugin,
  corsHelmetPlugin,
  ssePlugin,
  envPlugin
} from './plugins/index.js';
import { v1Routes } from './routes/api/v1/index.js';
import { healthRoutes } from './routes/api/v1/health.routes.js';

/**
 * P10 — Replaces the hand-rolled `onResponse` hook with a `LogController`
 * subclass. The native `requestCompleted` already runs for every finished
 * request (and covers `defaultErrorLog`/`streamError`/`routeNotFound` that the
 * old hook silently missed), so we only override the two bits we care about:
 * skip the liveness probe, and emit one compact `method url` line at the right
 * level.
 */
class ApiLogController extends LogController {
  isLogDisabled(request: FastifyRequest): boolean {
    return request.url === '/health';
  }

  requestCompleted(
    _error: Error | null | undefined,
    request: FastifyRequest,
    reply: FastifyReply
  ): void {
    const statusCode = reply.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'debug';
    request.log[level](
      { status: statusCode, ms: reply.elapsedTime },
      `${request.method} ${request.url}`
    );
  }
}

export async function createServer() {
  const isDev = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

  const app = Fastify({
    // F-2 — removed `disableRequestLogging: true` from the LogController
    // options. The `isLogDisabled` override on the same class (line 27-29)
    // already gates the only log we suppress (`/health`), so the inherited
    // boolean was a no-op for our code path. Dropping it also silences
    // the Fastify v6 deprecation warning FSTDEP023.
    logController: new ApiLogController(),
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
    trustProxy: env.TRUST_PROXY,
    // P21 — close idle (keep-alive) connections on shutdown so stuck
    // keep-alive sockets cannot delay a clean restart.
    //
    // F-3 — `'idle'` only closes sockets that are NOT currently sending
    // a request or waiting for a response. Active SSE streams hold the
    // socket busy, so this option does NOT terminate live SSE clients —
    // those are torn down by `ssePlugin`'s `preClose` hook, which calls
    // `sseHub.closeAll()` and ends each stream with a final `event: close`
    // frame before Fastify begins draining connections.
    forceCloseConnections: 'idle'
  }).withTypeProvider<TypeBoxTypeProvider>();

  // 1. Register Core Security & Infrastructure Plugins
  // D3 — env plugin first so other plugins can read `fastify.config` (typed
  // EnvConfig). The actual validation already happened at `@betrix/config`
  // import time via `Value.Parse` (fail-fast at module load); this just
  // exposes the result on the Fastify instance.
  await app.register(envPlugin);
  await app.register(corsHelmetPlugin);
  await app.register(rateLimitPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(ssePlugin);
  await app.register(containerPlugin);
  await app.register(betterAuthPlugin);
  await app.register(authPlugin);
  await app.register(swaggerPlugin);

  // 2. Register API Routes
  await app.register(v1Routes, { prefix: '/api/v1' });

  // P20 — health routes live at root `/health` (liveness) and `/health/deep`
  // (admin-only diagnostics), not under `/api/v1`. Mounted here so the paths
  // match their canonical form (and don't double-prefix via the v1 mount).
  await app.register(healthRoutes, { prefix: '/health' });

  // P6 — Central envelope: wrap any non-enveloped JSON payload from /api/v1 in
  // { success: true, data }. Handlers that already send { success, ... } (and
  // the error handler, which sends { success: false, error }) pass through
  // untouched; SSE streams and root probes (/health, /docs) are skipped so
  // their contracts stay stable.
  app.addHook('preSerialization', (request, reply, payload) => {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof (payload as { pipe?: unknown }).pipe === 'function' ||
      !request.url.startsWith('/api/v1') ||
      (payload as Record<string, unknown>).success !== undefined
    ) {
      return payload;
    }
    return { success: true, data: payload };
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
      await app.close();
      app.log.info('Server successfully closed.');
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

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
