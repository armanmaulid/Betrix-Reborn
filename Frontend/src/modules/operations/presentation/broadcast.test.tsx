import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { BroadcastMessageSchema } from '@/modules/operations/application/schemas/admin.schema';

describe('Phase 7 Broadcast Messaging Tests', () => {
  describe('BroadcastMessageSchema Validation (Test Gate 7.1)', () => {
    it('should validate subject and body bounds', () => {
      const valid = BroadcastMessageSchema.safeParse({
        subject: 'System Maintenance Notice',
        body: 'We will be conducting maintenance at 00:00 UTC.'
      });
      expect(valid.success).toBe(true);

      const emptySubject = BroadcastMessageSchema.safeParse({
        subject: '',
        body: 'Message content'
      });
      expect(emptySubject.success).toBe(false);

      const oversizedBody = BroadcastMessageSchema.safeParse({
        subject: 'Valid Subject',
        body: 'a'.repeat(5001)
      });
      expect(oversizedBody.success).toBe(false);
    });

    it('should accept optional targetUserIds array', () => {
      const withTargets = BroadcastMessageSchema.safeParse({
        subject: 'Direct User Alert',
        body: 'Important alert for specific accounts.',
        targetUserIds: ['usr-1', 'usr-2']
      });
      expect(withTargets.success).toBe(true);
    });
  });
});
