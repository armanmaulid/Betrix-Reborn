import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { JsonTreeViewer } from './json-tree-viewer';
import { AUDIT_ACTIONS } from '@/shared/utils/constants';
import { AuditLogQuerySchema } from '@/modules/operations/application/schemas/admin.schema';

describe('Phase 5 Audit Log Component Tests', () => {
  describe('JsonTreeViewer (Test Gate 5.3)', () => {
    it('should render formatted JSON metadata without throwing', () => {
      const onCloseMock = vi.fn();
      const mockDetails = {
        userId: 'usr-123',
        changedFields: {
          credits: { from: 100, to: 500 },
          status: { from: 'suspended', to: 'active' }
        },
        ip: '192.168.1.1'
      };

      render(
        <JsonTreeViewer
          isOpen={true}
          onClose={onCloseMock}
          title="UPDATE_USER"
          data={mockDetails}
        />
      );

      expect(
        screen.getByText(/AUDIT METADATA INSPECTOR \/\/ \[UPDATE_USER\]/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/192\.168\.1\.1/i)).toBeInTheDocument();
      expect(screen.getByText(/changedFields/i)).toBeInTheDocument();
    });
  });

  describe('Audit Log Actions & Query Schema (Poin 7)', () => {
    it('should include all required system actions in AUDIT_ACTIONS', () => {
      const actionValues = AUDIT_ACTIONS.map((a) => a.value);
      expect(actionValues).toContain('');
      expect(actionValues).toContain('CREATE_USER');
      expect(actionValues).toContain('UPDATE_USER');
      expect(actionValues).toContain('DELETE_USER');
      expect(actionValues).toContain('RESET_USER_PASSWORD');
      expect(actionValues).toContain('VIEW_USER_CHAT');
      expect(actionValues).toContain('CREATE_VOUCHER');
      expect(actionValues).toContain('REVOKE_VOUCHER');
      expect(actionValues).toContain('BATCH_REVOKE_VOUCHERS');
      expect(actionValues).toContain('CREATE_AGENT');
      expect(actionValues).toContain('UPDATE_AGENT');
      expect(actionValues).toContain('DELETE_AGENT');
      expect(actionValues).toContain('SET_DEFAULT_AGENT');
      expect(actionValues).toContain('BROADCAST_MESSAGE');
      expect(actionValues).toContain('SYSTEM_CLEANUP');
    });

    it('should parse AuditLogQuerySchema with action and actionType', () => {
      const parsed = AuditLogQuerySchema.parse({
        page: '2',
        limit: '25',
        action: 'CREATE_USER',
        actionType: 'CREATE_USER'
      });
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(25);
      expect(parsed.action).toBe('CREATE_USER');
      expect(parsed.actionType).toBe('CREATE_USER');
    });
  });
});
