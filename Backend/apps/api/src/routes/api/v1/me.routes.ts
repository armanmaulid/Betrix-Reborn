import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  UpdateProfileSchema,
  ChangePasswordSchema,
  ChangeEmailSchema,
  RedeemVoucherSchema,
  SendUserMessageSchema,
  ThreadIdParamSchema,
  IdParamSchema,
  UpdateNotificationPrefsSchema,
  PaginationQuerySchema
} from '@betrix/application';
import { Type } from '@sinclair/typebox';

export const meRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { useCases } = fastify.container;

  // Protect all /me/* routes with authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // 1. GET /me/profile — Get user profile & credit balance
  fastify.get(
    '/profile',
    {
      schema: {
        tags: ['Me'],
        summary: 'Get current user profile & credit balance',
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const user = await useCases.getProfileUseCase.execute(request.user.userId);
      return reply.send({
        success: true,
        data: user.toJSON()
      });
    }
  );

  // 2. PUT /me/profile — Update user profile details
  fastify.put(
    '/profile',
    {
      schema: {
        tags: ['Me'],
        summary: 'Update current user profile',
        body: UpdateProfileSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const updated = await useCases.updateProfileUseCase.execute(
        request.user.userId,
        request.body
      );
      return reply.send({
        success: true,
        data: updated.toJSON()
      });
    }
  );

  // 3. POST /me/change-password — Change account password
  fastify.post(
    '/change-password',
    {
      schema: {
        tags: ['Me'],
        summary: 'Change account password',
        body: ChangePasswordSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.changePasswordUseCase.execute(
        request.user.userId,
        request.body,
        request.user.sessionId
      );
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 4. POST /me/change-email — Change account email address
  fastify.post(
    '/change-email',
    {
      schema: {
        tags: ['Me'],
        summary: 'Change account email address',
        body: ChangeEmailSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.changeEmailUseCase.execute(request.user.userId, request.body);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 5. POST /me/redeem-voucher — Redeem credit voucher (ADR-29)
  fastify.post(
    '/redeem-voucher',
    {
      schema: {
        tags: ['Me'],
        summary: 'Redeem credit voucher code',
        body: RedeemVoucherSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.redeemVoucherUseCase.execute(request.user.userId, request.body);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // --- MESSAGING & INBOX ---

  // 6. GET /me/messages/inbox — Get received inbox messages
  fastify.get(
    '/messages/inbox',
    {
      schema: {
        tags: ['Me'],
        summary: 'Get received inbox messages',
        querystring: PaginationQuerySchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const page = request.query.page || 1;
      const limit = request.query.limit || 20;
      const paginated = await useCases.getInboxUseCase.execute(request.user.userId, {
        page,
        limit
      });
      return reply.send({
        success: true,
        data: paginated.data.map((m) => m.toJSON()),
        meta: {
          page: paginated.page,
          limit: paginated.limit,
          total: paginated.total,
          totalPages: paginated.totalPages
        }
      });
    }
  );

  // 7. GET /me/messages/sent — Get sent messages
  fastify.get(
    '/messages/sent',
    {
      schema: {
        tags: ['Me'],
        summary: 'Get sent messages',
        querystring: PaginationQuerySchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const page = request.query.page || 1;
      const limit = request.query.limit || 20;
      const paginated = await useCases.getSentMessagesUseCase.execute(request.user.userId, {
        page,
        limit
      });
      return reply.send({
        success: true,
        data: paginated.data.map((m) => m.toJSON()),
        meta: {
          page: paginated.page,
          limit: paginated.limit,
          total: paginated.total,
          totalPages: paginated.totalPages
        }
      });
    }
  );

  // 8. GET /me/messages/thread/:threadId — Get full message thread
  fastify.get(
    '/messages/thread/:threadId',
    {
      schema: {
        tags: ['Me'],
        summary: 'Get full message conversation thread',
        params: ThreadIdParamSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const messages = await useCases.getThreadUseCase.execute(
        request.params.threadId,
        request.user.userId
      );
      return reply.send({
        success: true,
        data: messages.map((m) => m.toJSON())
      });
    }
  );

  // 9. POST /me/messages — Send direct message to trader / admin
  fastify.post(
    '/messages',
    {
      schema: {
        tags: ['Me'],
        summary: 'Send message / support inquiry',
        body: SendUserMessageSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const saved = await useCases.sendUserMessageUseCase.execute(
        request.user.userId,
        request.body
      );
      return reply.status(201).send({
        success: true,
        data: saved.toJSON()
      });
    }
  );

  // 10. PATCH /me/messages/:id/read — Mark message as read
  fastify.patch(
    '/messages/:id/read',
    {
      schema: {
        tags: ['Me'],
        summary: 'Mark message as read',
        params: IdParamSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.markMessageReadUseCase.execute(
        request.user.userId,
        request.params.id
      );
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 11. DELETE /me/messages/:id — Delete message
  fastify.delete(
    '/messages/:id',
    {
      schema: {
        tags: ['Me'],
        summary: 'Delete message',
        params: IdParamSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.deleteMessageUseCase.execute(
        request.user.userId,
        request.params.id
      );
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 12. PUT /me/notifications/preferences — Update notification preferences
  fastify.put(
    '/notifications/preferences',
    {
      schema: {
        tags: ['Me'],
        summary: 'Update user notification preferences',
        body: UpdateNotificationPrefsSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const updated = await useCases.updateNotificationPrefsUseCase.execute(
        request.user.userId,
        request.body
      );
      return reply.send({
        success: true,
        data: updated
      });
    }
  );
};
