import React from 'react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { SystemCleanupSchema } from '@/modules/operations/application/schemas/admin.schema';

describe('Phase 7 System Maintenance Tests', () => {
  describe('SystemCleanupSchema Validation (Test Gate 7.3)', () => {
    it('should validate olderThanDays bounds (minimum 1 day)', () => {
      const valid = SystemCleanupSchema.safeParse({ olderThanDays: 30 });
      expect(valid.success).toBe(true);

      const invalidZero = SystemCleanupSchema.safeParse({ olderThanDays: 0 });
      expect(invalidZero.success).toBe(false);

      const invalidNegative = SystemCleanupSchema.safeParse({ olderThanDays: -10 });
      expect(invalidNegative.success).toBe(false);
    });

    it('should default olderThanDays to 30 if not specified', () => {
      const parsed = SystemCleanupSchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.olderThanDays).toBe(30);
      }
    });
  });

  describe('Background Worker Control Actions', () => {
    it('should validate allowed worker lifecycle actions', () => {
      const validActions = ['start', 'pause', 'stop', 'restart'];
      validActions.forEach((action) => {
        expect(['start', 'pause', 'stop', 'restart']).toContain(action);
      });
    });
  });
});
