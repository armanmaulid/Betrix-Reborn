'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  Users,
  Ticket,
  Bot,
  ShieldAlert,
  Radio,
  Wrench,
  Newspaper,
  Layers,
  Activity,
  PlusCircle,
  LogOut,
  Search,
  X
} from 'lucide-react';
import { useToast } from './ui/terminal-toast';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { success } = useToast();
  const [search, setSearch] = useState('');

  // Close on Escape when CommandPalette is active
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleLogout = async () => {
    onClose();
    await fetch('/api/auth/logout', { method: 'POST' });
    success('LOGGED OUT', 'Administrator session ended.');
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-xl border-2 border-accent bg-surface shadow-2xl overflow-hidden font-mono">
        <Command
          className="w-full bg-surface text-foreground"
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          {/* Search Header */}
          <div className="flex items-center border-b border-border px-3.5 py-2.5 bg-black">
            <Search className="w-4 h-4 text-accent shrink-0 mr-2.5" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or jump to page... (e.g. users, agent, voucher)"
              autoFocus
              className="w-full bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Results List */}
          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-2">
            <Command.Empty className="py-6 text-center text-xs font-mono text-muted-foreground">
              No matching command or destination found.
            </Command.Empty>

            {/* Navigation Group */}
            <Command.Group heading="[01] NAVIGATION DIRECTORY" className="text-[10px] text-accent/80 font-bold px-2 mb-1 uppercase tracking-wider">
              <Command.Item
                onSelect={() => handleNavigate('/dashboard')}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Main Operations Dashboard</span>
                </div>
                <kbd className="text-[9px] text-muted-foreground border border-border px-1">/dashboard</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/users')}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>User Accounts Management</span>
                </div>
                <kbd className="text-[9px] text-muted-foreground border border-border px-1">/users</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/vouchers')}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Ticket className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Credit Voucher Inventory</span>
                </div>
                <kbd className="text-[9px] text-muted-foreground border border-border px-1">/vouchers</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/agents')}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>AI Agent Fleet & Models</span>
                </div>
                <kbd className="text-[9px] text-muted-foreground border border-border px-1">/agents</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/news')}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Newspaper className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Finnhub Market News Stream</span>
                </div>
                <kbd className="text-[9px] text-muted-foreground border border-border px-1">/news</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/market-data')}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Market Instruments Catalog (symbols)</span>
                </div>
                <kbd className="text-[9px] text-muted-foreground border border-border px-1">/market-data</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/stream-symbols')}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Finnhub Real-Time Stream Terminal (stream_symbols)</span>
                </div>
                <kbd className="text-[9px] text-muted-foreground border border-border px-1">/stream-symbols</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/broadcast')}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Global Message Broadcast</span>
                </div>
                <kbd className="text-[9px] text-muted-foreground border border-border px-1">/broadcast</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/audit-logs')}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Security & Activity Audit Logs</span>
                </div>
                <kbd className="text-[9px] text-muted-foreground border border-border px-1">/audit-logs</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/maintenance')}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>System Maintenance & Workers</span>
                </div>
                <kbd className="text-[9px] text-muted-foreground border border-border px-1">/maintenance</kbd>
              </Command.Item>
            </Command.Group>

            {/* Quick Actions Group */}
            <Command.Group heading="[02] QUICK OPERATIONAL ACTIONS" className="text-[10px] text-accent/80 font-bold px-2 mb-1 uppercase tracking-wider">
              <Command.Item
                onSelect={() => handleNavigate('/vouchers?action=new')}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-3.5 h-3.5 text-positive" />
                  <span>Generate New Credit Voucher</span>
                </div>
                <span className="text-[10px] text-positive font-bold">+VOUCHER</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/agents/new')}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-3.5 h-3.5 text-positive" />
                  <span>Deploy New AI Agent</span>
                </div>
                <span className="text-[10px] text-positive font-bold">+AGENT</span>
              </Command.Item>
            </Command.Group>

            {/* System Actions Group */}
            <Command.Group heading="[03] SESSION CONTROLS" className="text-[10px] text-accent/80 font-bold px-2 mb-1 uppercase tracking-wider">
              <Command.Item
                onSelect={handleLogout}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-negative hover:bg-negative/10 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="w-3.5 h-3.5 text-negative" />
                  <span>Terminate Active Admin Session</span>
                </div>
                <span className="text-[10px] text-negative font-bold">LOGOUT</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer Bar */}
          <div className="border-t border-border bg-black px-3.5 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Navigate: <kbd className="border border-border px-1">↑</kbd> <kbd className="border border-border px-1">↓</kbd></span>
              <span>Select: <kbd className="border border-border px-1">↵</kbd></span>
            </div>
            <span>Dismiss: <kbd className="border border-border px-1">ESC</kbd></span>
          </div>
        </Command>
      </div>
    </div>
  );
}
