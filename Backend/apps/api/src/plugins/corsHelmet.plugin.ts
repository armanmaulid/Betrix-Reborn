import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { env } from '@betrix/config';

const corsHelmetPluginCallback: FastifyPluginAsync = async (fastify) => {
  // Production guard: a wildcard origin combined with credentialed requests is
  // an exploitable configuration the moment cookie/header auth changes. Fail
  // fast instead of booting an unsafe default.
  if (env.NODE_ENV === 'production' && env.CORS_ORIGIN.trim() === '*') {
    throw new Error(
      'CORS_ORIGIN=* is not allowed in production — set an explicit comma-separated origin list.'
    );
  }

  const isWildcard = env.CORS_ORIGIN.trim() === '*';
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const isDev = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

  // 1. Register CORS
  // P12 — let `@fastify/cors` do the matching. `true` is allowed in non-prod
  // (incl. dev/test and the `*` wildcard case); production gets an explicit
  // allow-list. `!isWildcard` keeps credentials off when we're in wildcard
  // mode to avoid the browser rejecting credentialed CORS.
  await fastify.register(fastifyCors, {
    origin: isDev || isWildcard ? true : allowedOrigins,
    credentials: !isWildcard,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'X-Total-Count']
  });

  // 2. Register Helmet Security Headers
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false, // Disabled to allow Swagger UI interactive dashboard and inline styles
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  });
};

export const corsHelmetPlugin = fp(corsHelmetPluginCallback, {
  name: 'cors-helmet-plugin'
});
