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

  // Credential endpoints get a much tighter bucket so IP rotation is the only
  // way around brute-force defense — and one noisy consumer of public market
  // data can never lock everyone out of login (shared global bucket).
  const AUTH_RATE_LIMIT = { max: 10, timeWindow: '1 minute' } as const;
  // NOTE: onRoute sees the pre-prefix url ('/login'), hence the optional
  // 'auth/' segment in the pattern.
  const CREDENTIAL_ENDPOINT =
    /\/(auth\/)?(login|register|forgot-password|reset-password|resend-verification)$/;
  fastify.addHook('onRoute', (routeOptions) => {
    const url = routeOptions.url || '';
    if (CREDENTIAL_ENDPOINT.test(url)) {
      routeOptions.config = { ...routeOptions.config, rateLimit: { ...AUTH_RATE_LIMIT } };
    }
  });
};

export const rateLimitPlugin = fp(rateLimitPluginCallback, {
  name: 'rate-limit-plugin'
});
