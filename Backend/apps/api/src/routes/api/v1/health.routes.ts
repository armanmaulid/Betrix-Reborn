import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { sql } from 'drizzle-orm';

export const healthRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { db, redis } = fastify.container;

  // 1. GET /health — Liveness probe (PUBLIC, zero internal detail).
  //    Unauthenticated callers get only ok/degraded — pg/redis error strings
  //    leak host/port/user topology details and must never leave the process.
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Liveness health check (public, no internals)'
      }
    },
    async (_request, reply) => {
      let isHealthy = true;

      try {
        await db.execute(sql`SELECT 1`);
      } catch (err) {
        isHealthy = false;
        // Details stay in server logs only.
        fastify.log.warn({ err }, 'Health check: postgres unreachable');
      }

      try {
        await redis.ping();
      } catch (err) {
        isHealthy = false;
        fastify.log.warn({ err }, 'Health check: redis unreachable');
      }

      return reply.status(isHealthy ? 200 : 503).send({
        success: isHealthy,
        data: {
          status: isHealthy ? 'ok' : 'degraded',
          timestamp: new Date().toISOString()
        }
      });
    }
  );

  // 2. GET /health/deep — Detailed diagnostics (ADMIN ONLY): latencies and
  //    per-service error messages for operators.
  fastify.get(
    '/deep',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['Admin'],
        summary: 'Deep System Health Check (Database & Redis) [admin]',
        security: [{ bearerAuth: [] }]
      }
    },
    async (_request, reply) => {
      let pgStatus = 'healthy';
      let redisStatus = 'healthy';
      let pgLatencyMs = 0;
      let redisLatencyMs = 0;

      try {
        const start = Date.now();
        await db.execute(sql`SELECT 1`);
        pgLatencyMs = Date.now() - start;
      } catch (err: any) {
        pgStatus = `unhealthy: ${err.message}`;
      }

      try {
        const start = Date.now();
        await redis.ping();
        redisLatencyMs = Date.now() - start;
      } catch (err: any) {
        redisStatus = `unhealthy: ${err.message}`;
      }

      const isHealthy = pgStatus === 'healthy' && redisStatus === 'healthy';

      return reply.status(isHealthy ? 200 : 503).send({
        success: isHealthy,
        data: {
          status: isHealthy ? 'ok' : 'degraded',
          timestamp: new Date().toISOString(),
          uptimeSeconds: Math.floor(process.uptime()),
          services: {
            postgres: { status: pgStatus, latencyMs: pgLatencyMs },
            redis: { status: redisStatus, latencyMs: redisLatencyMs }
          }
        }
      });
    }
  );
};
