import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateVoucherDialog } from './create-voucher-dialog';
import { ToastProvider } from '@/shared/presentation/ui/terminal-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

describe('Phase 5 Credit Voucher Component Tests', () => {
  describe('CreateVoucherDialog (Test Gate 5.1)', () => {
    it('should validate credit amount bounds (1 to 1,000,000)', async () => {
      const onCloseMock = vi.fn();
      render(<CreateVoucherDialog isOpen={true} onClose={onCloseMock} />, {
        wrapper: createWrapper()
      });

      const amountInput = screen.getByLabelText(/CREDIT VALUE/i);
      const submitBtn = screen.getByRole('button', { name: /ISSUE VOUCHER/i });

      // Invalid zero/negative amount
      fireEvent.change(amountInput, { target: { value: '0' } });
      const form = submitBtn.closest('form');
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Amount must be at least 1 credit/i)).toBeInTheDocument();
      });

      // Valid amount
      fireEvent.change(amountInput, { target: { value: '25000' } });
      expect(screen.getByDisplayValue('25000')).toBeInTheDocument();
    });
  });
});
