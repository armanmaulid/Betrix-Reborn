'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, Shield, LogOut, Command, Activity, Clock } from 'lucide-react';
import { useToast } from './ui/terminal-toast';

interface HeaderProps {
  onOpenCommandPalette: () => void;
}

export function Header({ onOpenCommandPalette }: HeaderProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [utcTime, setUtcTime] = useState<string>('');
  const [localTime, setLocalTime] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('admin@betrix.io');
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Live dual clock (UTC + Local)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
      setLocalTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch current admin user metadata from session cookie
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data?.success && data?.data?.user?.email) {
          setAdminEmail(data.data.user.email);
        }
      } catch {}
    };
    fetchSession();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      success('SESSION TERMINATED', 'Administrator logged out cleanly.');
      router.push('/login');
      router.refresh();
    } catch {
      error('LOGOUT FAILED', 'Unable to reach logout endpoint.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="h-12 border-b border-border bg-black px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* Left: Branding & Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-accent animate-pulse" />
          <span className="font-mono text-xs font-bold tracking-widest text-accent uppercase">
            BETRIX // ADMIN TERMINAL
          </span>
        </div>
        <div className="hidden sm:flex items-center space-x-1.5 border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-positive">
          <Activity className="w-3 h-3 text-positive animate-ping" />
          <span>API 100% ONLINE</span>
        </div>
      </div>

      {/* Center: Command Palette Trigger & Live Dual Clock */}
      <div className="flex items-center space-x-4">
        {/* Command Palette Button */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center space-x-2 bg-surface hover:bg-surface-hover border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
          title="Open Terminal Command Menu (Ctrl+K / Cmd+K)"
        >
          <Command className="w-3.5 h-3.5 text-accent" />
          <span className="hidden md:inline text-[11px]">COMMAND PALETTE</span>
          <kbd className="border border-border/80 bg-black px-1.5 py-0.2 text-[10px] text-accent font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Live Clock Display */}
        <div className="hidden lg:flex items-center space-x-2 font-mono text-xs text-muted-foreground border-l border-border pl-4">
          <Clock className="w-3.5 h-3.5 text-info" />
          <span className="tabular-nums text-foreground">{utcTime}</span>
          <span className="text-[10px] text-muted-foreground">({localTime} LOC)</span>
        </div>
      </div>

      {/* Right: Current Admin Identity & Logout */}
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-2 border border-border bg-surface px-2.5 py-1">
          <Shield className="w-3.5 h-3.5 text-accent" />
          <span className="font-mono text-xs text-foreground/90 max-w-[140px] truncate" title={adminEmail}>
            {adminEmail}
          </span>
          <span className="font-mono text-[9px] bg-accent/20 text-accent px-1 font-bold">
            ROOT
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center space-x-1.5 border border-border bg-surface hover:bg-negative/20 hover:border-negative/50 hover:text-negative text-muted-foreground px-2.5 py-1 text-xs font-mono transition-colors disabled:opacity-50"
          title="Sign Out of Terminal"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">EXIT</span>
        </button>
      </div>
    </header>
  );
}
