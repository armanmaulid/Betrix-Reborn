'use client';

import React from 'react';
import { Terminal, Shield, LogOut, Command } from 'lucide-react';
import { useLogout } from '@/shared/presentation/hooks/use-logout';
import { useSession } from '@/shared/presentation/hooks/use-session';

interface HeaderProps {
  onOpenCommandPalette: () => void;
}

export function Header({ onOpenCommandPalette }: HeaderProps) {
  const { logout, isLoggingOut } = useLogout();
  const { currentUser, isLoading: isSessionLoading } = useSession();
  const adminEmail = currentUser?.email || '';

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="h-12 border-b border-border bg-black px-4 flex items-center justify-between select-none shrink-0 z-30 font-mono">
      {/* Left: Branding */}
      <div className="flex items-center space-x-2 shrink-0">
        <Terminal className="w-4 h-4 text-accent animate-pulse" />
        <span className="text-xs font-bold tracking-widest text-accent uppercase">
          BETRIX // ADMIN TERMINAL
        </span>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="flex items-center justify-center flex-1 max-w-sm sm:max-w-md mx-2 sm:mx-4">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between bg-surface hover:bg-surface-hover border border-border px-3 py-1 text-muted-foreground hover:text-foreground transition-colors text-xs shadow-inner group cursor-pointer"
          title="Open Terminal Command Menu (Ctrl+K / Cmd+K)"
        >
          <div className="flex items-center space-x-2">
            <Command className="w-3.5 h-3.5 text-accent group-hover:text-foreground transition-colors" />
            <span className="text-[11px] uppercase tracking-wider">COMMAND PALETTE</span>
          </div>
          <kbd className="border border-border/80 bg-black px-1.5 py-0.5 text-[10px] text-accent">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Current Admin Identity & Logout */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="hidden sm:flex items-center space-x-2 border border-border bg-surface px-2.5 py-1">
          <Shield className="w-3.5 h-3.5 text-accent" />
          <span
            className="text-xs text-foreground/90 max-w-[140px] truncate"
            title={adminEmail || undefined}
          >
            {isSessionLoading && !currentUser ? '…' : adminEmail || 'UNAUTHENTICATED'}
          </span>
          {currentUser?.isAdmin && (
            <span className="text-[9px] bg-accent/20 text-accent px-1 font-bold">ROOT</span>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center space-x-1.5 border border-border bg-surface hover:bg-negative/20 hover:border-negative/50 hover:text-negative text-muted-foreground px-2.5 py-1 text-xs transition-colors disabled:opacity-50 cursor-pointer"
          title="Sign Out of Terminal"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">EXIT</span>
        </button>
      </div>
    </header>
  );
}
