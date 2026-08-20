import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { sql } from 'drizzle-orm';

export const healthRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { db, redis } = fastify.container;

  // 1. GET /health — Deep System Health Check
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Deep System Health Check (Database & Redis)'
      }
    },
    async (request, reply) => {
      let pgStatus = 'healthy';
      let redisStatus = 'healthy';
      let pgLatencyMs = 0;
      let redisLatencyMs = 0;

      // 1. Check PostgreSQL
      try {
        const start = Date.now();
        await db.execute(sql`SELECT 1`);
        pgLatencyMs = Date.now() - start;
      } catch (err: any) {
        pgStatus = `unhealthy: ${err.message}`;
      }

      // 2. Check Redis
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
