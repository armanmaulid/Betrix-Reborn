import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UpdateUserDialog } from './update-user-dialog';
import { ResetPasswordDialog } from './reset-password-dialog';
import { UserChatHistory } from './user-chat-history';
import { UserTierBadge } from './user-tier-badge';
import { ToastProvider } from '@/shared/presentation/ui/terminal-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AdminUser, AdminChatMessage } from '@/modules/identity/domain/entities/User';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

describe('Phase 4 User Management Component Tests', () => {
  const mockUser: AdminUser = {
    id: 'usr-123',
    email: 'trader@betrix.io',
    name: 'Alex Trader',
    status: 'active',
    isAdmin: false,
    credits: 50000,
    emailVerified: true,
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-21T00:00:00Z'
  };

  describe('UpdateUserDialog (Test Gate 4.2)', () => {
    it('should populate form with user data and handle updates', async () => {
      const onCloseMock = vi.fn();
      render(<UpdateUserDialog user={mockUser} isOpen={true} onClose={onCloseMock} />, {
        wrapper: createWrapper()
      });

      expect(screen.getByDisplayValue('Alex Trader')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50000')).toBeInTheDocument();

      const nameInput = screen.getByDisplayValue('Alex Trader');
      fireEvent.change(nameInput, { target: { value: 'Alex Pro' } });

      const saveButton = screen.getByRole('button', { name: /SAVE PARAMETERS/i });
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe('ResetPasswordDialog (Test Gate 4.4)', () => {
    it('should validate minimum password length requirement', async () => {
      const onCloseMock = vi.fn();
      render(<ResetPasswordDialog user={mockUser} isOpen={true} onClose={onCloseMock} />, {
        wrapper: createWrapper()
      });

      const passwordInput = screen.getByPlaceholderText('••••••••••••');
      const submitBtn = screen.getByRole('button', { name: /FORCE RESET/i });

      // Type short password (less than 8 chars)
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('UserChatHistory (Poin 3 Audit)', () => {
    const mockMessages: AdminChatMessage[] = [
      {
        id: 'msg-1',
        userId: 'usr-123',
        sessionId: 'sess-abc-123',
        taskType: 'market_analysis',
        modelUsed: 'deepseek-reasoner',
        message: 'Analyze EURUSD momentum at 1.0850',
        reply: 'EURUSD is testing key resistance level with RSI at 62.',
        latencyMs: 350,
        inputTokens: 120,
        outputTokens: 85,
        totalTokens: 205,
        createdAt: '2026-08-21T10:00:00Z'
      }
    ];

    it('should render user chat audit trail and display conversation', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockMessages,
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 }
        })
      } as any);

      render(<UserChatHistory userId="usr-123" userEmail="trader@betrix.io" />, {
        wrapper: createWrapper()
      });

      expect(screen.getByText(/USER CHAT AUDIT TRAIL/i)).toBeInTheDocument();
      expect(screen.getByText('trader@betrix.io')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Analyze EURUSD momentum/i)).toBeInTheDocument();
        expect(screen.getByText('deepseek-reasoner')).toBeInTheDocument();
        expect(screen.getByText('350ms')).toBeInTheDocument();
      });

      // Expand to view prompt and AI reply
      const itemRow = screen.getByText(/Analyze EURUSD momentum/i);
      fireEvent.click(itemRow);

      await waitFor(() => {
        expect(screen.getByText(/USER PROMPT/i)).toBeInTheDocument();
        expect(screen.getByText(/AI COMPLETION/i)).toBeInTheDocument();
        expect(screen.getByText(/EURUSD is testing key resistance/i)).toBeInTheDocument();
      });
    });

    it('should allow filtering by session ID', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockMessages,
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 }
        })
      } as any);

      render(<UserChatHistory userId="usr-123" userEmail="trader@betrix.io" />, {
        wrapper: createWrapper()
      });

      const filterInput = screen.getByPlaceholderText(/FILTER BY SESSION ID/i);
      fireEvent.change(filterInput, { target: { value: 'sess-abc-123' } });

      const filterBtn = screen.getByRole('button', { name: /FILTER/i });
      fireEvent.click(filterBtn);

      await waitFor(() => {
        expect(screen.getByText(/FILTERED BY SESSION:/i)).toBeInTheDocument();
      });
    });
  });

  describe('UserTierBadge & Commercial Tiers (Poin 4)', () => {
    it('should render UserTierBadge for all valid tiers', () => {
      const { rerender } = render(<UserTierBadge tier="free" />);
      expect(screen.getByText('FREE')).toBeInTheDocument();

      rerender(<UserTierBadge tier="starter" />);
      expect(screen.getByText('STARTER')).toBeInTheDocument();

      rerender(<UserTierBadge tier="pro" />);
      expect(screen.getByText('PRO')).toBeInTheDocument();

      rerender(<UserTierBadge tier="premium" />);
      expect(screen.getByText('PREMIUM')).toBeInTheDocument();

      rerender(<UserTierBadge tier="vip" />);
      expect(screen.getByText('VIP')).toBeInTheDocument();
    });
  });
});
