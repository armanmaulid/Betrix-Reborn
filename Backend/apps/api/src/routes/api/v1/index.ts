import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { chatRoutes } from './chat.routes.js';
import { marketRoutes } from './market.routes.js';
import { newsRoutes } from './news.routes.js';
import { meRoutes } from './me.routes.js';
import { adminRoutes } from './admin.routes.js';
import { streamRoutes } from './stream.routes.js';
import { calendarRoutes } from './calendar.routes.js';

export const v1Routes: FastifyPluginAsyncTypebox = async (fastify) => {
  await fastify.register(chatRoutes, { prefix: '/chat' });
  await fastify.register(marketRoutes, { prefix: '/market' });
  await fastify.register(newsRoutes, { prefix: '/news' });
  await fastify.register(meRoutes, { prefix: '/me' });
  await fastify.register(adminRoutes, { prefix: '/admin' });
  await fastify.register(streamRoutes, { prefix: '/stream' });
  await fastify.register(calendarRoutes, { prefix: '/calendar' });
  // P20 — health routes are mounted at root `/health` (not under `/api/v1`)
  // so they don't collide with the static `/health` probe. See server.ts.
};
