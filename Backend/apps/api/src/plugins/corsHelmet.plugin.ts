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

  // 1. Register CORS
  await fastify.register(fastifyCors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return cb(null, true);

      // Wildcard stays possible OUTSIDE production (dev/test convenience).
      // Credentials are only sent for explicit allow-lists.
      if (isWildcard && env.NODE_ENV !== 'production') {
        return cb(null, true);
      }
      if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
        return cb(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      return cb(new Error('Origin not allowed by CORS policy'), false);
    },
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
