import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { authRoutes } from './auth.routes.js';
import { chatRoutes } from './chat.routes.js';
import { marketRoutes } from './market.routes.js';
import { newsRoutes } from './news.routes.js';
import { meRoutes } from './me.routes.js';
import { adminRoutes } from './admin.routes.js';
import { streamRoutes } from './stream.routes.js';
import { healthRoutes } from './health.routes.js';

export const v1Routes: FastifyPluginAsyncTypebox = async (fastify) => {
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(chatRoutes, { prefix: '/chat' });
  await fastify.register(marketRoutes, { prefix: '/market' });
  await fastify.register(newsRoutes, { prefix: '/news' });
  await fastify.register(meRoutes, { prefix: '/me' });
  await fastify.register(adminRoutes, { prefix: '/admin' });
  await fastify.register(streamRoutes, { prefix: '/stream' });
  await fastify.register(healthRoutes, { prefix: '/health' });
};
