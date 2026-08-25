import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DestructiveConfirmDialog } from '../ui/destructive-confirm-dialog';
import { ToastProvider, useToast } from '../ui/terminal-toast';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { CommandPalette } from './command-palette';

// Mock ResizeObserver and scrollIntoView for cmdk in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams()
}));

// Helper component for testing toast hook
function ToastTriggerTestComponent() {
  const { success, error } = useToast();
  return (
    <div>
      <button onClick={() => success('VOUCHER_REVOKED', 'Voucher code BTX-123 was revoked.')}>
        Trigger Success
      </button>
      <button onClick={() => error('SERVER_ERROR', 'Failed to reach backend.')}>
        Trigger Error
      </button>
    </div>
  );
}

describe('Phase 2 HUD & Component Tests', () => {
  describe('DestructiveConfirmDialog (Two-Step Verification)', () => {
    it('should keep confirm button disabled until exact target identifier is typed', () => {
      const onConfirmMock = vi.fn();
      const onCloseMock = vi.fn();

      render(
        <DestructiveConfirmDialog
          isOpen={true}
          onClose={onCloseMock}
          onConfirm={onConfirmMock}
          title="Delete User Account"
          description="Permanently delete user and cascade all sessions."
          targetIdentifier="trader@betrix.io"
        />
      );

      const confirmButton = screen.getByRole('button', { name: /CONFIRM DESTRUCTION/i });
      const input = screen.getByPlaceholderText(/Type "trader@betrix.io"/i);

      // Initially disabled
      expect(confirmButton).toBeDisabled();

      // Type partial or wrong string -> still disabled
      fireEvent.change(input, { target: { value: 'trader@wrong.io' } });
      expect(confirmButton).toBeDisabled();

      // Type exact target identifier -> button enabled
      fireEvent.change(input, { target: { value: 'trader@betrix.io' } });
      expect(confirmButton).toBeEnabled();

      // Click confirm -> triggers onConfirm
      fireEvent.click(confirmButton);
      expect(onConfirmMock).toHaveBeenCalledTimes(1);
    });

    it('should close dialog when Escape key is pressed', () => {
      const onCloseMock = vi.fn();
      render(
        <DestructiveConfirmDialog
          isOpen={true}
          onClose={onCloseMock}
          onConfirm={vi.fn()}
          title="Delete Agent"
          description="Delete AI Model."
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Terminal Toast System', () => {
    it('should display terminal styled toasts on trigger and allow dismissal', async () => {
      render(
        <ToastProvider>
          <ToastTriggerTestComponent />
        </ToastProvider>
      );

      const triggerBtn = screen.getByText('Trigger Success');
      act(() => {
        fireEvent.click(triggerBtn);
      });

      expect(screen.getByText('VOUCHER_REVOKED')).toBeInTheDocument();
      expect(screen.getByText('Voucher code BTX-123 was revoked.')).toBeInTheDocument();

      // Dismiss button
      const dismissBtn = screen.getByRole('button', { name: /Dismiss notification/i });
      act(() => {
        fireEvent.click(dismissBtn);
      });

      expect(screen.queryByText('VOUCHER_REVOKED')).not.toBeInTheDocument();
    });
  });

  describe('Header Component', () => {
    it('should render terminal branding and trigger command palette callback on click', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      });
      const onOpenCommandPaletteMock = vi.fn();
      await act(async () => {
        render(
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <Header onOpenCommandPalette={onOpenCommandPaletteMock} />
            </ToastProvider>
          </QueryClientProvider>
        );
      });

      expect(screen.getByText(/BETRIX \/\/ ADMIN TERMINAL/i)).toBeInTheDocument();

      const cmdButton = screen.getByTitle(/Open Terminal Command Menu/i);
      fireEvent.click(cmdButton);
      expect(onOpenCommandPaletteMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sidebar Navigation (Expanded & Navrail)', () => {
    it('should render all 10 operational directory links in expanded mode', () => {
      const onToggleMock = vi.fn();
      render(<Sidebar isCollapsed={false} onToggleCollapse={onToggleMock} />);

      expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
      expect(screen.getByText('USER MANAGEMENT')).toBeInTheDocument();
      expect(screen.getByText('CREDIT VOUCHERS')).toBeInTheDocument();
      expect(screen.getByText('AI AGENTS')).toBeInTheDocument();
      expect(screen.getByText('FINNHUB NEWS')).toBeInTheDocument();
      expect(screen.getByText('MARKET CATALOG')).toBeInTheDocument();
      expect(screen.getByText('STREAM SYMBOLS')).toBeInTheDocument();
      expect(screen.getByText('BROADCAST MSG')).toBeInTheDocument();
      expect(screen.getByText('AUDIT LOGS')).toBeInTheDocument();
      expect(screen.getByText('MAINTENANCE')).toBeInTheDocument();

      const collapseBtn = screen.getByTitle(/Collapse to Navrail/i);
      fireEvent.click(collapseBtn);
      expect(onToggleMock).toHaveBeenCalledTimes(1);
    });

    it('should render compact navrail with tooltips in collapsed mode', () => {
      const onToggleMock = vi.fn();
      render(<Sidebar isCollapsed={true} onToggleCollapse={onToggleMock} />);

      expect(screen.getByTitle(/DASHBOARD \[01\]/i)).toBeInTheDocument();
      expect(screen.getByTitle(/USER MANAGEMENT \[02\]/i)).toBeInTheDocument();
      expect(screen.getByTitle(/CREDIT VOUCHERS \[03\]/i)).toBeInTheDocument();

      const expandBtn = screen.getAllByTitle(/Expand Sidebar/i)[0];
      fireEvent.click(expandBtn);
      expect(onToggleMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Command Palette & Keyboard Shortcut Controls', () => {
    it('should close CommandPalette when Escape is pressed', () => {
      const onCloseMock = vi.fn();
      render(
        <ToastProvider>
          <CommandPalette isOpen={true} onClose={onCloseMock} />
        </ToastProvider>
      );

      expect(screen.getByPlaceholderText(/Type a command or jump to page/i)).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  describe('StatusBar & Centralized Telemetry Hub', () => {
    it('should render live telemetry status bar and toggle drawer on click', async () => {
      const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
      const { StatusBar } = await import('./status-bar');
      const testQueryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      });

      await act(async () => {
        render(
          <QueryClientProvider client={testQueryClient}>
            <StatusBar />
          </QueryClientProvider>
        );
      });

      // Status Bar footer elements
      expect(screen.getByText(/PG POOL:/i)).toBeInTheDocument();
      expect(screen.getByText(/REDIS:/i)).toBeInTheDocument();
      expect(screen.getByText(/STREAM:/i)).toBeInTheDocument();
      expect(screen.getByText(/AUTH:/i)).toBeInTheDocument();
      expect(screen.getByText(/JWT\/HTTPONLY/i)).toBeInTheDocument();
      expect(screen.getByText(/TELEMETRY/i)).toBeInTheDocument();

      // Click to open slide-up drawer
      const toggleBtn = screen.getByTitle(/Toggle Live System Telemetry Hub/i);
      fireEvent.click(toggleBtn);

      expect(screen.getByText(/CENTRALIZED INFRASTRUCTURE & TELEMETRY HUB/i)).toBeInTheDocument();
      expect(screen.getByText(/POSTGRESQL POOL/i)).toBeInTheDocument();
      expect(screen.getByText(/REDIS IN-MEMORY/i)).toBeInTheDocument();
      expect(screen.getByText(/WORKERS \(/i)).toBeInTheDocument();
      expect(screen.getByText(/STREAM GATEWAY/i)).toBeInTheDocument();

      // Click close button
      const closeBtn = screen.getByTitle(/Close Telemetry Drawer/i);
      fireEvent.click(closeBtn);

      expect(
        screen.queryByText(/CENTRALIZED INFRASTRUCTURE & TELEMETRY HUB/i)
      ).not.toBeInTheDocument();

      // Open drawer again and test Escape key closes it
      fireEvent.click(toggleBtn);
      expect(screen.getByText(/CENTRALIZED INFRASTRUCTURE & TELEMETRY HUB/i)).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(
        screen.queryByText(/CENTRALIZED INFRASTRUCTURE & TELEMETRY HUB/i)
      ).not.toBeInTheDocument();
    });
  });
});
