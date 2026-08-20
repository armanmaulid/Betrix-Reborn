import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyRateLimit from '@fastify/rate-limit';
import { env } from '@betrix/config';

const rateLimitPluginCallback: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyRateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX || 120,
    timeWindow: env.RATE_LIMIT_WINDOW_MS || 60000,
    errorResponseBuilder: (request, context) => {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. You can send up to ${context.max} requests per ${context.after}. Please try again later.`,
          details: {
            retryAfter: context.after
          }
        }
      };
    }
  });
};

export const rateLimitPlugin = fp(rateLimitPluginCallback, {
  name: 'rate-limit-plugin'
});
