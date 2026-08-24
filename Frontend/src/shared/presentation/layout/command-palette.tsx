'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  PlusCircle,
  LogOut,
  Search,
  X
} from 'lucide-react';
import { useLogout } from '@/shared/presentation/hooks/use-logout';
import { ADMIN_ROUTES } from '@/shared/utils/routes';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { logout } = useLogout();
  const [search, setSearch] = useState('');

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

  const handleLogout = () => {
    logout({ onBeforeLogout: onClose });
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
    >
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
              className="text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
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
              {ADMIN_ROUTES.map((route) => {
                const Icon = route.icon;
                return (
                  <Command.Item
                    key={route.href}
                    value={`${route.name} ${route.description} ${route.href}`}
                    onSelect={() => handleNavigate(route.href)}
                    className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{route.description}</span>
                    </div>
                    <kbd className="text-[9px] text-muted-foreground border border-border px-1">{route.href}</kbd>
                  </Command.Item>
                );
              })}
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
