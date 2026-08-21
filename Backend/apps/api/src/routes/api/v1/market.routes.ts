import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  GetSymbolsQuerySchema,
  GetOHLCParamsSchema,
  GetOHLCQuerySchema
} from '@betrix/application';
import { Type } from '@sinclair/typebox';

export const marketRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { useCases } = fastify.container;

  // 1. GET /market/symbols — List all tradable instruments
  fastify.get(
    '/symbols',
    {
      schema: {
        tags: ['Market'],
        summary: 'List tradable market symbols and categories',
        querystring: GetSymbolsQuerySchema
      }
    },
    async (request, reply) => {
      const symbols = await useCases.getSymbolsUseCase.execute(request.query);
      return reply.send({
        success: true,
        data: symbols.map((s) => s.toJSON())
      });
    }
  );

  // 1b. GET /market/stream-symbols — List Finnhub WebSocket stream symbols from stream_symbols table
  fastify.get(
    '/stream-symbols',
    {
      schema: {
        tags: ['Market'],
        summary: 'List verified Finnhub WebSocket stream symbols from stream_symbols table',
        querystring: Type.Object({
          activeOnly: Type.Optional(Type.Boolean({ default: false }))
        })
      }
    },
    async (request, reply) => {
      const activeOnly = (request.query as any)?.activeOnly === true;
      const symbols = await useCases.getStreamSymbolsUseCase.execute(activeOnly);
      return reply.send({
        success: true,
        data: symbols
      });
    }
  );

  // 2. GET /market/prices — Get real-time price ticks enriched with 24h % changes
  fastify.get(
    '/prices',
    {
      schema: {
        tags: ['Market'],
        summary: 'Get latest market prices with 24h price changes',
        querystring: Type.Object({
          symbol: Type.Optional(Type.String())
        })
      }
    },
    async (request, reply) => {
      const result = await useCases.getPricesUseCase.execute(request.query.symbol);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 3. GET /market/ohlc/:symbol/:timeframe — On-demand historical OHLC candle data (ADR-27)
  fastify.get(
    '/ohlc/:symbol/:timeframe',
    {
      schema: {
        tags: ['Market'],
        summary: 'Get historical OHLC candlestick data',
        params: GetOHLCParamsSchema,
        querystring: GetOHLCQuerySchema
      }
    },
    async (request, reply) => {
      const candles = await useCases.getOHLCUseCase.execute(
        request.params,
        request.query
      );
      return reply.send({
        success: true,
        data: candles.map((c) => c.toJSON())
      });
    }
  );
};
