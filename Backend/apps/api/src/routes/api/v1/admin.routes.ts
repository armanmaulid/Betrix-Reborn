import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { randomUUID } from 'node:crypto';
import { env } from '@betrix/config';
import { NotFoundError } from '@betrix/core';
import { createRedisClient, redisKeys } from '@betrix/infra';
import {
  AdminUsersQuerySchema,
  UpdateAdminUserSchema,
  CreateAdminUserSchema,
  ResetUserPasswordSchema,
  AdminUserChatHistoryQuerySchema,
  CreateVoucherSchema,
  ListVouchersQuerySchema,
  BatchRevokeVouchersSchema,
  BroadcastMessageSchema,
  AuditLogQuerySchema,
  SystemCleanupSchema,
  IdParamSchema,
  CreateAgentSchema,
  UpdateAgentSchema,
  AgentIdParamSchema,
  TestAgentSchema,
  AnalyticsQuerySchema,
  ControlWorkerSchema,
  SaveSymbolSchema,
  SaveStreamSymbolSchema,
  SaveOhlcSymbolSchema,
  BatchDeleteNewsBodySchema
} from '@betrix/application';

import { Type } from '@sinclair/typebox';

export const adminRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { useCases } = fastify.container;

  // T3.3 — live worker telemetry heartbeats (Redis, TTL 90s). Read-only here:
  // writers are the worker processes themselves via ManagedWorkerBase.
  const wStateRedis = createRedisClient();
  interface HeartbeatOverlayable {
    workerId: string;
    processedCount?: number;
    errorCount?: number;
    lastError?: string | null;
    lastReportAt?: Date;
  }
  const overlayLiveHeartbeats = async <T extends HeartbeatOverlayable>(rows: T[]) =>
    Promise.all(
      rows.map(async (row) => {
        try {
          const raw = await wStateRedis.get<string>(redisKeys.workerHeartbeat(row.workerId));
          if (!raw) return row;
          const hb = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const ts = Number(hb?.ts) || 0;
          if (!ts || Date.now() - ts >= 90_000) return row;
          return {
            ...row,
            processedCount: hb.processedCount ?? row.processedCount,
            errorCount: hb.errorCount ?? row.errorCount,
            lastError: hb.lastError ?? row.lastError,
            lastReportAt: new Date(ts)
          };
        } catch {
          return row;
        }
      })
    );

  // Protect all /admin/* routes with Admin RBAC guard
  fastify.addHook('preHandler', fastify.requireAdmin);

  // 0b. GET /admin/metrics/stream — live ops SSE for the executive dashboard.
  // Same Admin RBAC guard as every /admin/* route; the Next.js BFF proxies and
  // streams this endpoint server-side (cookie -> Authorization injection).
  fastify.get(
    '/metrics/stream',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Live dashboard metrics & analytics stream (SSE)',
        description:
          'Pushes a full { metrics, analytics } snapshot every ~10s. Replaces client polling — the frontend writes frames straight into its query cache.'
      }
    },
    async (request, reply) => {
      const userId = request.authUser!.id;
      const clientId = `ops-${userId}-${randomUUID()}`;
      fastify.sseHub.addClient(clientId, userId, 'ops', request, reply);
    }
  );

  // 0. POST /admin/users — Create a user directly from the admin panel
  fastify.post(
    '/users',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Create a new user (password optional — generated if omitted)',
        body: CreateAdminUserSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const { user, generatedPassword } = await useCases.createAdminUserUseCase.execute(
        request.authUser!.id,
        request.body,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.status(201).send({
        success: true,
        data: {
          user: user.toJSON(),
          // Shown once in the admin UI — not stored anywhere in plaintext
          generatedPassword
        }
      });
    }
  );

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
      const { page = 1, limit = 20 } = request.query;
      const paginated = await useCases.getAdminUsersUseCase.execute(
        { page, limit },
        request.query.search,
        request.query.tier
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
        summary: 'Get comprehensive user profile with devices, sessions & recent activity',
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
          sessions: detail.sessions.map((s) => s.toJSON()),
          recentActivity: detail.recentActivity,
          usageSummary: detail.usageSummary
        }
      });
    }
  );

  // 2a. DELETE /admin/users/:id/sessions/:sessionId — Revoke a specific session
  fastify.delete(
    '/users/:id/sessions/:sessionId',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Revoke a specific user session',
        params: Type.Object({
          id: Type.String(),
          sessionId: Type.String()
        }),
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      try {
        const result = await useCases.revokeUserSessionUseCase.execute(
          request.authUser!.id,
          request.params.id,
          request.params.sessionId,
          { ip: request.ip, userAgent: request.headers['user-agent'] }
        );
        return reply.send({
          success: true,
          data: result
        });
      } catch (err) {
        // P9 — let genuine infra failures surface as 500; only re-wrap a real
        // not-found as a friendly 404 instead of masking every error as 404.
        if (err instanceof NotFoundError) {
          throw new NotFoundError('Session not found or already revoked');
        }
        throw err;
      }
    }
  );

  // 2b. DELETE /admin/users/:id/sessions — Revoke all sessions for a user
  fastify.delete(
    '/users/:id/sessions',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Revoke all active sessions for a user',
        params: IdParamSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.revokeAllUserSessionsUseCase.execute(
        request.authUser!.id,
        request.params.id,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 2c. DELETE /admin/users/:id/devices/:deviceId — Remove a specific device
  fastify.delete(
    '/users/:id/devices/:deviceId',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Remove a specific user device',
        params: Type.Object({
          id: Type.String(),
          deviceId: Type.String()
        }),
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      try {
        const result = await useCases.removeUserDeviceUseCase.execute(
          request.authUser!.id,
          request.params.id,
          request.params.deviceId,
          { ip: request.ip, userAgent: request.headers['user-agent'] }
        );
        return reply.send({
          success: true,
          data: result
        });
      } catch (err) {
        if (err instanceof NotFoundError) {
          throw new NotFoundError('Device not found or already removed');
        }
        throw err;
      }
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
        request.authUser!.id,
        request.params.id,
        request.body,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
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
      const result = await useCases.deleteAdminUserUseCase.execute(
        request.authUser!.id,
        request.params.id,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
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
        request.authUser!.id,
        request.params.id,
        request.body,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 5b. GET /admin/users/:id/chat-history — Get chat history of a specific user with audit logging
  fastify.get(
    '/users/:id/chat-history',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Get chat history of a specific user with audit logging',
        params: IdParamSchema,
        querystring: AdminUserChatHistoryQuerySchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const { page = 1, limit = 20 } = request.query;
      const result = await useCases.getAdminUserChatHistoryUseCase.execute(
        request.authUser!.id,
        request.params.id,
        { page, limit },
        request.query.sessionId,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
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
      const voucher = await useCases.createVoucherUseCase.execute(
        request.authUser!.id,
        request.body,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.status(201).send({
        success: true,
        data: voucher.toJSON()
      });
    }
  );

  // 7. GET /admin/vouchers — List credit vouchers (filter + sort)
  fastify.get(
    '/vouchers',
    {
      schema: {
        tags: ['Admin'],
        summary: 'List credit vouchers with status filter and sorting',
        querystring: ListVouchersQuerySchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const { page, limit, isRedeemed, sortBy, sortOrder } = request.query;
      const paginated = await useCases.listVouchersUseCase.execute(
        { page: page || 1, limit: limit || 20 },
        isRedeemed !== undefined ? { isRedeemed } : undefined,
        { sortBy, sortOrder }
      );
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

  // 7b. POST /admin/vouchers/batch-revoke — Revoke multiple vouchers
  fastify.post(
    '/vouchers/batch-revoke',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Revoke (delete) multiple vouchers in one call',
        body: BatchRevokeVouchersSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const { revoked, failed } = await useCases.batchRevokeVouchersUseCase.execute(
        request.authUser!.id,
        request.body.ids,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: { revoked, failed }
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
      const result = await useCases.revokeVoucherUseCase.execute(
        request.authUser!.id,
        request.params.id,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
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
      // T3.1 — OPS_SOURCE=cache (default) reads the 60s aggregator gauges;
      // 'pg' forces a live aggregate for parity checks.
      const source = env.OPS_SOURCE || 'cache';
      const metrics =
        source === 'cache'
          ? await useCases.getSystemMetricsUseCase.executeCached()
          : await useCases.getSystemMetricsUseCase.execute();
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
        querystring: AnalyticsQuerySchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const analytics = await useCases.getAnalyticsUseCase.execute(request.query);
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
      const { page = 1, limit = 20 } = request.query;
      const action = request.query.actionType || request.query.action;
      const userId = request.query.userId;
      const paginated = await useCases.getAuditLogsUseCase.execute({ page, limit }, action, userId);
      return reply.send({
        success: true,
        data: paginated.data,
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
          format: Type.Optional(
            Type.Union([Type.Literal('csv'), Type.Literal('json')], { default: 'csv' })
          ),
          action: Type.Optional(Type.String()),
          actionType: Type.Optional(Type.String())
        }),
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const format = (request.query.format as 'csv' | 'json') || 'csv';
      const action = request.query.actionType || request.query.action;
      const result = await useCases.exportAuditLogsUseCase.execute(format, action);
      reply.header(
        'Content-Type',
        format === 'json' ? 'application/json' : 'text/csv; charset=utf-8'
      );
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
      const result = await useCases.broadcastMessageUseCase.execute(
        request.authUser!.id,
        request.body,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
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
      const result = await useCases.systemCleanupUseCase.execute(request.body, {
        adminId: request.authUser!.id,
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });
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
      const agent = await useCases.createAgentUseCase.execute(request.body, request.authUser!.id, {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });
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
      const updated = await useCases.updateAgentUseCase.execute(
        request.authUser!.id,
        request.params.id,
        request.body,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
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
      const deleted = await useCases.deleteAgentUseCase.execute(
        request.authUser!.id,
        request.params.id,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
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
      const success = await useCases.setDefaultAgentUseCase.execute(
        request.authUser!.id,
        request.params.id,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: { isDefault: success }
      });
    }
  );

  // 21. POST /admin/agents/:id/test — Execute ephemeral QA test prompt (Admin Test Console)
  fastify.post(
    '/agents/:id/test',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Execute ephemeral test completion against AI agent without credit deduction',
        params: AgentIdParamSchema,
        body: TestAgentSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.testAgentUseCase.execute(request.params.id, request.body);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 22. GET /admin/workers — List background workers and pipeline state
  fastify.get(
    '/workers',
    {
      schema: {
        tags: ['Admin'],
        summary: 'List background workers and real-time pipeline status',
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const workers = await useCases.listWorkersUseCase.execute();
      // T3.3 — overlay live Redis heartbeats so counters/errors reflect the
      // last seconds instead of the last command report.
      const data = await overlayLiveHeartbeats(workers as never[]);
      return reply.send({
        success: true,
        data
      });
    }
  );

  // 23. POST /admin/workers/:id/control — Control background worker state
  fastify.post(
    '/workers/:id/control',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Control background worker state (start, pause, stop, restart)',
        params: IdParamSchema,
        body: ControlWorkerSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const updated = await useCases.controlWorkerUseCase.execute(
        request.authUser!.id,
        request.params.id,
        request.body,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: updated
      });
    }
  );

  // 24. POST /admin/news/poll — Trigger immediate Finnhub news poll
  fastify.post(
    '/news/poll',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Manually poll and store latest Finnhub market news articles',
        body: Type.Optional(
          Type.Object({
            category: Type.Optional(Type.String({ default: 'general' }))
          })
        ),
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const category = request.body?.category || 'general';
      const articles = await useCases.fetchNewsUseCase.execute(
        { category },
        { adminId: request.authUser!.id, ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: {
          polledCount: articles.length,
          category,
          articles: articles.map((a) => a.toJSON())
        }
      });
    }
  );

  // 24a. DELETE /admin/news/:id — Delete single news article
  fastify.delete(
    '/news/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Delete single market news article from database',
        params: Type.Object({ id: Type.String() }),
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const deleted = await useCases.deleteNewsUseCase.execute(
        request.authUser!.id,
        request.params.id,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: { message: 'News article not found or already deleted' }
        });
      }
      return reply.send({
        success: true,
        data: { id: request.params.id, deleted: true }
      });
    }
  );

  // 24b. POST /admin/news/batch-delete — Batch delete news articles
  fastify.post(
    '/news/batch-delete',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Batch delete market news articles from database',
        body: BatchDeleteNewsBodySchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const count = await useCases.batchDeleteNewsUseCase.execute(
        request.authUser!.id,
        request.body.ids,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: { deletedCount: count }
      });
    }
  );

  // 25. POST /admin/symbols — Add or update instrument symbol in database

  fastify.post(
    '/symbols',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Add or update market instrument symbol in database',
        body: SaveSymbolSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const saved = await useCases.saveSymbolUseCase.execute(request.authUser!.id, request.body, {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });
      return reply.send({
        success: true,
        data: saved.toJSON()
      });
    }
  );

  // 26. PATCH /admin/symbols/:symbol — Update instrument symbol
  fastify.patch(
    '/symbols/:symbol',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Update existing market instrument symbol',
        params: Type.Object({ symbol: Type.String() }),
        body: SaveSymbolSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const saved = await useCases.saveSymbolUseCase.execute(
        request.authUser!.id,
        { ...request.body, symbol: request.params.symbol },
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: saved.toJSON()
      });
    }
  );

  // 27. DELETE /admin/symbols/:symbol — Remove instrument symbol from database
  fastify.delete(
    '/symbols/:symbol',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Delete market instrument symbol from database',
        params: Type.Object({ symbol: Type.String() }),
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const deleted = await useCases.deleteSymbolUseCase.execute(
        request.authUser!.id,
        request.params.symbol,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: { deleted }
      });
    }
  );

  // 28. POST /admin/stream-symbols — Add or update Finnhub WebSocket stream symbol in stream_symbols table
  fastify.post(
    '/stream-symbols',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Add or update Finnhub WebSocket stream symbol in stream_symbols table',
        body: SaveStreamSymbolSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const saved = await useCases.saveStreamSymbolUseCase.execute(
        request.authUser!.id,
        request.body,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: saved
      });
    }
  );

  // 29. PATCH /admin/stream-symbols/:symbol — Update stream symbol
  fastify.patch(
    '/stream-symbols/:symbol',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Update existing Finnhub WebSocket stream symbol',
        params: Type.Object({ symbol: Type.String() }),
        body: SaveStreamSymbolSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const saved = await useCases.saveStreamSymbolUseCase.execute(
        request.authUser!.id,
        { ...request.body, symbol: request.params.symbol },
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: saved
      });
    }
  );

  // 30. DELETE /admin/stream-symbols/:symbol — Delete stream symbol from stream_symbols table
  fastify.delete(
    '/stream-symbols/:symbol',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Delete stream symbol from stream_symbols table',
        params: Type.Object({ symbol: Type.String() }),
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const deleted = await useCases.deleteStreamSymbolUseCase.execute(
        request.authUser!.id,
        request.params.symbol,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: { deleted }
      });
    }
  );

  // 31. GET /admin/ohlc-symbols — List all OHLC symbols
  fastify.get(
    '/ohlc-symbols',
    {
      schema: {
        tags: ['Admin'],
        summary: 'List all OHLC (Dukascopy) historical data symbol mappings',
        querystring: Type.Object({
          activeOnly: Type.Optional(Type.Boolean({ default: false }))
        }),
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const activeOnly = request.query.activeOnly === true;
      const symbols = await useCases.getOhlcSymbolsUseCase.execute(activeOnly);
      return reply.send({
        success: true,
        data: symbols
      });
    }
  );

  // 32. POST /admin/ohlc-symbols — Add or update OHLC symbol
  fastify.post(
    '/ohlc-symbols',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Add or update OHLC (Dukascopy) historical data symbol mapping',
        body: SaveOhlcSymbolSchema,
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const saved = await useCases.saveOhlcSymbolUseCase.execute(
        request.authUser!.id,
        request.body,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: saved
      });
    }
  );

  // 33. DELETE /admin/ohlc-symbols/:symbol — Delete OHLC symbol
  fastify.delete(
    '/ohlc-symbols/:symbol',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Delete OHLC (Dukascopy) historical data symbol mapping',
        params: Type.Object({ symbol: Type.String() }),
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const deleted = await useCases.deleteOhlcSymbolUseCase.execute(
        request.authUser!.id,
        request.params.symbol,
        { ip: request.ip, userAgent: request.headers['user-agent'] }
      );
      return reply.send({
        success: true,
        data: { deleted }
      });
    }
  );
};
