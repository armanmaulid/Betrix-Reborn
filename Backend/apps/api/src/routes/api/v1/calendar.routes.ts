import { Type } from '@sinclair/typebox';
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

const GetCalendarQuerySchema = Type.Object({
  currency: Type.Optional(Type.String()),
  month: Type.Optional(
    Type.String({
      description: 'YYYY-MM — omit to get upcoming events instead of a specific month'
    })
  ),
  limit: Type.Optional(Type.Number())
});

export const calendarRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { useCases } = fastify.container;

  // 1. GET /calendar — Retrieve economic calendar events (upcoming, or a specific YYYY-MM month)
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Calendar'],
        summary: 'Get economic calendar events (Before/Forecast/Actual)',
        querystring: GetCalendarQuerySchema
      }
    },
    async (request, reply) => {
      const events = await useCases.getCalendarUseCase.execute(request.query);
      return reply.send({
        success: true,
        data: events.map((e) => e.toJSON())
      });
    }
  );
};
