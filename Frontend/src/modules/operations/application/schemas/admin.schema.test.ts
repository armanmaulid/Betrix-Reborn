import { describe, it, expect } from 'vitest';
import { BroadcastMessageSchema, SystemCleanupSchema } from './admin.schema';
import { UpdateAdminUserSchema } from '@identity/application/schemas/admin-user.schema';
import { CreateVoucherSchema } from '@billing/application/schemas/voucher.schema';
import { CreateAgentSchema } from '@/modules/intelligence/application/schemas/agent.schema';

describe('Admin & Agent Zod Schemas Validation Parity Tests', () => {
  describe('UpdateAdminUserSchema', () => {
    it('should validate valid user update payload', () => {
      const valid = {
        name: 'Super Admin',
        isAdmin: true,
        status: 'active' as const,
        credits: 5000
      };
      const result = UpdateAdminUserSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status enum or negative credits', () => {
      const invalidStatus = { status: 'invalid_status' };
      expect(UpdateAdminUserSchema.safeParse(invalidStatus).success).toBe(false);

      const negativeCredits = { credits: -50 };
      expect(UpdateAdminUserSchema.safeParse(negativeCredits).success).toBe(false);
    });
  });

  describe('CreateVoucherSchema', () => {
    it('should validate valid voucher payload', () => {
      const valid = {
        code: 'BTX-PROMO-100',
        amount: 500,
        expiresAt: '2026-12-31T23:59:59Z'
      };
      const result = CreateVoucherSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject voucher amount outside 1 - 1,000,000 range', () => {
      expect(CreateVoucherSchema.safeParse({ amount: 0 }).success).toBe(false);
      expect(CreateVoucherSchema.safeParse({ amount: 1000001 }).success).toBe(false);
    });
  });

  describe('CreateAgentSchema', () => {
    it('should validate valid AI agent configuration and apply defaults', () => {
      const valid = {
        id: 'gpt-4o-institutional',
        name: 'GPT-4o Institutional',
        modelName: 'gpt-4o'
      };
      const result = CreateAgentSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tier).toBe('deep');
        expect(result.data.maxTokens).toBe(8192);
        expect(result.data.temperature).toBe(0.7);
        expect(result.data.supportsThinking).toBe(true);
      }
    });

    it('should enforce temperature bounds (0 to 2)', () => {
      const tooHigh = {
        id: 'agent-1',
        name: 'Agent 1',
        modelName: 'model-1',
        temperature: 2.5
      };
      expect(CreateAgentSchema.safeParse(tooHigh).success).toBe(false);

      const tooLow = {
        id: 'agent-1',
        name: 'Agent 1',
        modelName: 'model-1',
        temperature: -0.1
      };
      expect(CreateAgentSchema.safeParse(tooLow).success).toBe(false);
    });

    it('should enforce maxTokens bounds (256 to 65536)', () => {
      const tooSmall = {
        id: 'agent-1',
        name: 'Agent 1',
        modelName: 'model-1',
        maxTokens: 100
      };
      expect(CreateAgentSchema.safeParse(tooSmall).success).toBe(false);

      const tooBig = {
        id: 'agent-1',
        name: 'Agent 1',
        modelName: 'model-1',
        maxTokens: 100000
      };
      expect(CreateAgentSchema.safeParse(tooBig).success).toBe(false);
    });
  });

  describe('BroadcastMessageSchema', () => {
    it('should validate broadcast payload and reject body > 5000 chars', () => {
      const valid = {
        subject: 'System Maintenance Notice',
        body: 'Scheduled maintenance starting at 00:00 UTC.'
      };
      expect(BroadcastMessageSchema.safeParse(valid).success).toBe(true);

      const tooLong = {
        subject: 'Too Long',
        body: 'A'.repeat(5001)
      };
      expect(BroadcastMessageSchema.safeParse(tooLong).success).toBe(false);
    });
  });

  describe('SystemCleanupSchema', () => {
    it('should default olderThanDays to 30 and reject <= 0', () => {
      const defaultParsed = SystemCleanupSchema.parse({});
      expect(defaultParsed.olderThanDays).toBe(30);

      expect(SystemCleanupSchema.safeParse({ olderThanDays: 0 }).success).toBe(false);
    });
  });
});
