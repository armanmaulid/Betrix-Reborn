import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { randomUUID } from 'node:crypto';
import { UnauthorizedError } from '@betrix/core';

export const streamRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { stores } = fastify.container;

  // 1. GET /stream/market — Real-time Price Ticks SSE Stream (ADR-18 & ADR-36)
  fastify.get(
    '/market',
    {
      schema: {
        tags: ['Streams'],
        summary: 'Real-time market price ticks stream (SSE)',
        description:
          'Subscribes to live price ticks. Authenticated via single-use ticket issued by /api/v1/auth/stream-ticket.',
        querystring: Type.Object({
          ticket: Type.String({ minLength: 10, description: 'Single-use stream ticket' }),
          symbols: Type.Optional(
            Type.String({ description: 'Comma-separated symbols filter (e.g. EURUSD,XAUUSD)' })
          )
        })
      }
    },
    async (request, reply) => {
      const { ticket, symbols } = request.query;

      // Validate and burn ticket (ADR-18)
      const userId = await stores.ticketStore.getAndDelete(ticket);
      if (!userId) {
        throw new UnauthorizedError('Invalid or expired SSE stream ticket.');
      }

      const symbolList = symbols
        ? symbols.split(',').map((s) => s.trim().toUpperCase())
        : undefined;
      const clientId = `market-${userId}-${randomUUID()}`;

      fastify.sseHub.addClient(clientId, userId, 'market', request, reply, symbolList);
    }
  );

  // 2. GET /stream/news — Real-time News Articles SSE Stream
  fastify.get(
    '/news',
    {
      schema: {
        tags: ['Streams'],
        summary: 'Real-time market news stream (SSE)',
        description:
          'Subscribes to live incoming news articles. Authenticated via single-use ticket.',
        querystring: Type.Object({
          ticket: Type.String({ minLength: 10, description: 'Single-use stream ticket' })
        })
      }
    },
    async (request, reply) => {
      const { ticket } = request.query;

      const userId = await stores.ticketStore.getAndDelete(ticket);
      if (!userId) {
        throw new UnauthorizedError('Invalid or expired SSE stream ticket.');
      }

      const clientId = `news-${userId}-${randomUUID()}`;
      fastify.sseHub.addClient(clientId, userId, 'news', request, reply);
    }
  );
};
