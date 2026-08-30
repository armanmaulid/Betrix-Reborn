import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { GetNewsQuerySchema } from '@betrix/application';

export const newsRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { useCases } = fastify.diContainer.cradle;

  // 1. GET /news — Retrieve paginated and filtered market news
  fastify.get(
    '/',
    {
      schema: {
        tags: ['News'],
        summary: 'Get market news articles',
        querystring: GetNewsQuerySchema
      }
    },
    async (request, reply) => {
      const paginated = await useCases.getNewsUseCase.execute(request.query);
      return reply.send({
        success: true,
        data: paginated.data.map((a) => a.toJSON()),
        meta: {
          page: paginated.page,
          limit: paginated.limit,
          total: paginated.total,
          totalPages: paginated.totalPages
        }
      });
    }
  );
};
