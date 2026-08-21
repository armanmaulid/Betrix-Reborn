import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { env } from '@betrix/config';

const swaggerPluginCallback: FastifyPluginAsync = async (fastify) => {
  // Full interactive API map is a dev tool — never expose it in production
  if (env.NODE_ENV === 'production') {
    fastify.log.info('Swagger UI disabled in production');
    return;
  }

  // 1. Register OpenAPI Specification Generator
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Betrix-Reborn Market Intelligence API',
        description: 'Institutional-grade AI-powered market intelligence, real-time technical analysis, and event streaming backend.',
        version: '1.0.0'
      },
      servers: [
        {
          url: '/',
          description: 'Current Origin API Server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your JWT token obtained from /api/v1/auth/login or /api/v1/auth/register'
          }
        }
      },
      security: [
        {
          bearerAuth: []
        }
      ],
      tags: [
        { name: 'Auth', description: 'Authentication, registration, sessions, and verification' },
        { name: 'Chat', description: 'AI market intelligence chat, reasoning stream, and models' },
        { name: 'Market', description: 'Real-time symbols, live tick prices, and historical OHLC data' },
        { name: 'News', description: 'Market news feed with auto-tagging and sentiment analysis' },
        { name: 'Me', description: 'User profile, credit voucher redemption, and messaging' },
        { name: 'Admin', description: 'User management, metrics, analytics, vouchers, and audit logs' },
        { name: 'Streams', description: 'Real-time Server-Sent Events (SSE) data feeds' }
      ]
    }
  });

  // 2. Register Interactive Swagger UI Dashboard
  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      persistAuthorization: true
    },
    staticCSP: false
  });

  // Redirect /doc to /docs for developer convenience
  fastify.get('/doc', async (request, reply) => {
    return reply.redirect('/docs');
  });

  fastify.log.info(`Swagger UI documentation registered at http://localhost:${env.PORT}/docs`);
};

export const swaggerPlugin = fp(swaggerPluginCallback, {
  name: 'swagger-plugin'
});
