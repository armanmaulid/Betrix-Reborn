import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { PassThrough } from 'node:stream';
import { SendMessageSchema, StreamMessageSchema, SessionIdParamSchema } from '@betrix/application';
import { sseFrame } from '../../../plugins/sse.plugin.js';
import { Type } from '@sinclair/typebox';

export const chatRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { useCases } = fastify.container;

  // 1. POST /chat — Synchronous AI Market Analysis completion
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chat'],
        summary: 'Synchronous AI market intelligence analysis',
        body: SendMessageSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.sendMessageUseCase.execute(request.user.userId, request.body);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 2. POST /chat/stream — Real-time SSE Streaming AI response (Dual reasoning stream ADR-10)
  fastify.post(
    '/stream',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chat'],
        summary: 'Streaming AI market intelligence analysis (SSE)',
        description:
          'Streams AI reasoning process (<think>) and incremental response chunks via Server-Sent Events.',
        body: StreamMessageSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      // P1 — hand the SSE stream to Fastify's lifecycle (reply.send) so CORS/
      // helmet hooks and onClose teardown apply, instead of poking reply.raw.
      const stream = new PassThrough();
      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache, no-transform');
      reply.header('Connection', 'keep-alive');
      reply.header('X-Accel-Buffering', 'no');
      reply.send(stream);

      // P2 — one frame serializer, shared with the SSE hub.
      const writeEvent = (event: string, data: unknown) => {
        try {
          stream.write(sseFrame(event, data));
        } catch {
          // Stream interrupted
        }
      };

      // Bug #5: abort the generation the moment the client disconnects so we
      // stop paying the upstream AI provider for tokens nobody will receive.
      const abortController = new AbortController();
      request.raw.on('close', () => abortController.abort());

      try {
        await useCases.streamMessageUseCase.execute(
          request.user.userId,
          request.body,
          {
            onThink: (chunk: string) => {
              writeEvent('think', chunk);
            },
            onDelta: (chunk: string) => {
              writeEvent('delta', chunk);
            },
            onDone: (meta) => {
              writeEvent('done', meta);
              stream.end();
            },
            onError: (err: Error) => {
              writeEvent('error', { message: err.message });
              stream.end();
            }
          },
          abortController.signal
        );
      } catch (err: any) {
        writeEvent('error', { message: err.message || 'Stream processing failed' });
        stream.end();
      }
    }
  );

  // 3. GET /chat/history — Retrieve user chat sessions / history
  fastify.get(
    '/history',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chat'],
        summary: 'Get user chat history',
        querystring: Type.Object({
          sessionId: Type.Optional(Type.String()),
          page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
          limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 }))
        }),
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const { sessionId, page = 1, limit = 20 } = request.query;
      const result = await useCases.getChatHistoryUseCase.execute(
        request.user.userId,
        { page, limit },
        sessionId
      );

      if (Array.isArray(result)) {
        return reply.send({
          success: true,
          data: result.map((m) => m.toJSON())
        });
      }

      return reply.send({
        success: true,
        data: result.data.map((m) => m.toJSON()),
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    }
  );

  // 4. DELETE /chat/session/:sessionId — Delete chat session
  fastify.delete(
    '/session/:sessionId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chat'],
        summary: 'Delete chat session',
        params: SessionIdParamSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.deleteChatSessionUseCase.execute(
        request.params.sessionId,
        request.user.userId
      );
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 5. GET /chat/export/:sessionId — Export chat session as Markdown
  fastify.get(
    '/export/:sessionId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chat'],
        summary: 'Export chat session as Markdown file',
        params: SessionIdParamSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const markdown = await useCases.exportChatUseCase.execute(
        request.params.sessionId,
        request.user.userId
      );

      reply.header('Content-Type', 'text/markdown; charset=utf-8');
      reply.header(
        'Content-Disposition',
        `attachment; filename="chat-${request.params.sessionId}.md"`
      );
      return reply.send(markdown);
    }
  );

  // 6. GET /chat/models — List supported AI models / dynamic database agents
  fastify.get(
    '/models',
    {
      schema: {
        tags: ['Chat'],
        summary: 'List available dynamic AI agents and model configurations'
      }
    },
    async (_request, reply) => {
      const models = await useCases.listModelsUseCase.execute();
      return reply.send({
        success: true,
        data: models
      });
    }
  );

  // 7. GET /chat/agents — List active AI agents for chat selection
  fastify.get(
    '/agents',
    {
      schema: {
        tags: ['Chat'],
        summary: 'List active dynamic AI agents and persona definitions'
      }
    },
    async (_request, reply) => {
      const agents = await useCases.listAgentsUseCase.execute({
        activeOnly: true,
        visibility: 'public'
      });
      return reply.send({
        success: true,
        data: agents.map((a) => a.toJSON())
      });
    }
  );
};
