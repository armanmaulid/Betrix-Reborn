import Fastify from 'fastify';
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
    }
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
      await app.close();
      app.log.info('Server successfully closed.');
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`🚀 Betrix-Reborn Fastify 5 API listening on http://${env.HOST}:${env.PORT}`);
    app.log.info(`📚 Swagger UI documentation available at http://${env.HOST}:${env.PORT}/docs`);
    return app;
  } catch (err) {
    if ((err as { code?: string }).code === 'EADDRINUSE') {
      app.log.error(
        `Port ${env.PORT} already in use. Kill the old process (taskkill //PID <pid> //T //F) then restart.`
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
