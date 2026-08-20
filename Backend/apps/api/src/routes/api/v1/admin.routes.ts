import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  AdminUsersQuerySchema,
  UpdateAdminUserSchema,
  ResetUserPasswordSchema,
  CreateVoucherSchema,
  BroadcastMessageSchema,
  AuditLogQuerySchema,
  SystemCleanupSchema,
  IdParamSchema,
  PaginationQuerySchema,
  CreateAgentSchema,
  UpdateAgentSchema,
  AgentIdParamSchema
} from '@betrix/application';
import { Type } from '@sinclair/typebox';

export const adminRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { useCases } = fastify.container;

  // Protect all /admin/* routes with Admin RBAC guard
  fastify.addHook('preHandler', fastify.requireAdmin);

  // 1. GET /admin/users — List and filter users
  fastify.get(
    '/users',
    {
      schema: {
        tags: ['Admin'],
        summary: 'List users with pagination and search filter',
        querystring: AdminUsersQuerySchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const page = request.query.page || 1;
      const limit = request.query.limit || 20;
      const paginated = await useCases.getAdminUsersUseCase.execute(
        { page, limit },
        request.query.search
      );
      return reply.send({
        success: true,
        data: paginated.data.map((u) => u.toJSON()),
        meta: {
          page: paginated.page,
          limit: paginated.limit,
          total: paginated.total,
          totalPages: paginated.totalPages
        }
      });
    }
  );

  // 2. GET /admin/users/:id — Get comprehensive user details
  fastify.get(
    '/users/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Get comprehensive user profile with devices & sessions',
        params: IdParamSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const detail = await useCases.getAdminUserDetailUseCase.execute(request.params.id);
      return reply.send({
        success: true,
        data: {
          user: detail.user.toJSON(),
          devices: detail.devices.map((d) => d.toJSON()),
          sessions: detail.sessions.map((s) => s.toJSON())
        }
      });
    }
  );

  // 3. PATCH /admin/users/:id — Update user status, credits, or admin role
  fastify.patch(
    '/users/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Update user account status, credits, or role',
        params: IdParamSchema,
        body: UpdateAdminUserSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const updated = await useCases.updateAdminUserUseCase.execute(
        request.user.userId,
        request.params.id,
        request.body
      );
      return reply.send({
        success: true,
        data: updated.toJSON()
      });
    }
  );

  // 4. DELETE /admin/users/:id — Delete user account
  fastify.delete(
    '/users/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Delete user account and revoke active sessions',
        params: IdParamSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.deleteAdminUserUseCase.execute(request.user.userId, request.params.id);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 5. POST /admin/users/:id/reset-password — Force reset user password
  fastify.post(
    '/users/:id/reset-password',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Force reset user password by admin',
        params: IdParamSchema,
        body: ResetUserPasswordSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.resetUserPasswordUseCase.execute(
        request.user.userId,
        request.params.id,
        request.body
      );
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // --- VOUCHERS MANAGEMENT (ADR-29) ---

  // 6. POST /admin/vouchers — Create new credit voucher
  fastify.post(
    '/vouchers',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Generate credit voucher code',
        body: CreateVoucherSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const voucher = await useCases.createVoucherUseCase.execute(request.user.userId, request.body);
      return reply.status(201).send({
        success: true,
        data: voucher.toJSON()
      });
    }
  );

  // 7. GET /admin/vouchers — List credit vouchers
  fastify.get(
    '/vouchers',
    {
      schema: {
        tags: ['Admin'],
        summary: 'List credit vouchers',
        querystring: PaginationQuerySchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const page = request.query.page || 1;
      const limit = request.query.limit || 20;
      const paginated = await useCases.listVouchersUseCase.execute({ page, limit });
      return reply.send({
        success: true,
        data: paginated.data.map((v) => v.toJSON()),
        meta: {
          page: paginated.page,
          limit: paginated.limit,
          total: paginated.total,
          totalPages: paginated.totalPages
        }
      });
    }
  );

  // 8. DELETE /admin/vouchers/:id — Revoke voucher
  fastify.delete(
    '/vouchers/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Revoke credit voucher',
        params: IdParamSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.revokeVoucherUseCase.execute(request.user.userId, request.params.id);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // --- METRICS & ANALYTICS ---

  // 9. GET /admin/metrics — System & Server Health Metrics
  fastify.get(
    '/metrics',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Get real-time system metrics (CPU, Memory, Uptime)',
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const metrics = await useCases.getSystemMetricsUseCase.execute();
      return reply.send({
        success: true,
        data: metrics
      });
    }
  );

  // 10. GET /admin/analytics — User & Business Analytics
  fastify.get(
    '/analytics',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Get user growth, credits consumed, and active session analytics',
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const analytics = await useCases.getAnalyticsUseCase.execute();
      return reply.send({
        success: true,
        data: analytics
      });
    }
  );

  // 11. GET /admin/audit-logs — Query audit logs
  fastify.get(
    '/audit-logs',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Query system audit logs',
        querystring: AuditLogQuerySchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const page = request.query.page || 1;
      const limit = request.query.limit || 20;
      const paginated = await useCases.getAuditLogsUseCase.execute(
        { page, limit },
        request.query.actionType
      );
      return reply.send({
        success: true,
        data: paginated.data.map((l) => l.toJSON()),
        meta: {
          page: paginated.page,
          limit: paginated.limit,
          total: paginated.total,
          totalPages: paginated.totalPages
        }
      });
    }
  );

  // 12. GET /admin/audit-logs/export — Export audit logs as CSV or JSON
  fastify.get(
    '/audit-logs/export',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Export audit logs as CSV or JSON',
        querystring: Type.Object({
          format: Type.Optional(Type.Union([Type.Literal('csv'), Type.Literal('json')], { default: 'csv' }))
        }),
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const format = (request.query.format as 'csv' | 'json') || 'csv';
      const result = await useCases.exportAuditLogsUseCase.execute(format);
      reply.header('Content-Type', format === 'json' ? 'application/json' : 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${result.filename}"`);
      return reply.send(result.content);
    }
  );

  // 13. POST /admin/broadcast — Broadcast message to users
  fastify.post(
    '/broadcast',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Broadcast system notification to active users',
        body: BroadcastMessageSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.broadcastMessageUseCase.execute(request.user.userId, request.body);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 14. POST /admin/cleanup — Trigger manual maintenance / token purge
  fastify.post(
    '/cleanup',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Purge expired tokens, sessions, and transient cache',
        body: SystemCleanupSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.systemCleanupUseCase.execute(request.body);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 15. GET /admin/agents — List all AI agents (active & inactive)
  fastify.get(
    '/agents',
    {
      schema: {
        tags: ['Admin'],
        summary: 'List all dynamic AI agents and model configurations',
        security: [{ bearerAuth: [] }]
      }
    },
    async (_request, reply) => {
      const agents = await useCases.listAgentsUseCase.execute(false);
      return reply.send({
        success: true,
        data: agents.map((a) => a.toJSON())
      });
    }
  );

  // 16. POST /admin/agents — Create new AI agent / model
  fastify.post(
    '/agents',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Create a new AI Agent with custom system prompt and pricing',
        body: CreateAgentSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const agent = await useCases.createAgentUseCase.execute(request.body);
      return reply.status(201).send({
        success: true,
        data: agent.toJSON()
      });
    }
  );

  // 17. GET /admin/agents/:id — Get AI agent detail
  fastify.get(
    '/agents/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Get AI agent details by ID',
        params: AgentIdParamSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const agent = await useCases.getAgentUseCase.execute(request.params.id);
      return reply.send({
        success: true,
        data: agent.toJSON()
      });
    }
  );

  // 18. PATCH /admin/agents/:id — Update AI agent configuration
  fastify.patch(
    '/agents/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Update existing AI agent configuration, model, prompt, or rates',
        params: AgentIdParamSchema,
        body: UpdateAgentSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const updated = await useCases.updateAgentUseCase.execute(request.params.id, request.body);
      return reply.send({
        success: true,
        data: updated.toJSON()
      });
    }
  );

  // 19. DELETE /admin/agents/:id — Delete AI agent
  fastify.delete(
    '/agents/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Delete AI agent from database',
        params: AgentIdParamSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const deleted = await useCases.deleteAgentUseCase.execute(request.params.id);
      return reply.send({
        success: true,
        data: { deleted }
      });
    }
  );

  // 20. POST /admin/agents/:id/set-default — Set AI agent as system default
  fastify.post(
    '/agents/:id/set-default',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Set AI agent as active system default (immediate effect without restart)',
        params: AgentIdParamSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const success = await useCases.setDefaultAgentUseCase.execute(request.params.id);
      return reply.send({
        success: true,
        data: { isDefault: success }
      });
    }
  );
};
