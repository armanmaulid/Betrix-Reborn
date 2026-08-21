'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Providers } from '@/components/providers';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { CommandPalette } from '@/components/command-palette';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Restore collapsed state from localStorage on client hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem('betrix_sidebar_collapsed');
      if (saved === 'true') {
        setIsSidebarCollapsed(true);
      }
    } catch {}
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('betrix_sidebar_collapsed', next.toString());
      } catch {}
      return next;
    });
  }, []);

  // Global Keyboard Shortcuts (Ctrl+K, Cmd+K, Alt+1..7, [, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Toggle Command Palette (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // If user is currently focused on an input/textarea/select/modal, ignore navigation & toggles
      const activeEl = document.activeElement;
      const isTyping =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (isTyping || isCommandPaletteOpen) {
        return;
      }

      // 2. Toggle Sidebar Collapse (Shortcut: [ or Ctrl+B / Cmd+B)
      if (
        (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B'))
      ) {
        e.preventDefault();
        handleToggleSidebar();
        return;
      }

      // 3. Fast Route Jumping via Alt+Number or Direct 0-9 when idle
      const key = e.key;
      const routeMap: Record<string, string> = {
        '1': '/dashboard',
        '2': '/users',
        '3': '/vouchers',
        '4': '/agents',
        '5': '/news',
        '6': '/market-data',
        '7': '/stream-symbols',
        '8': '/broadcast',
        '9': '/audit-logs',
        '0': '/maintenance'
      };

      if (routeMap[key] && (e.altKey || (!e.ctrlKey && !e.metaKey && !e.shiftKey))) {
        e.preventDefault();
        router.push(routeMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [router, isCommandPaletteOpen, handleToggleSidebar]);

  const handleCloseCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  return (
    <Providers>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none">
        {/* Top Bloomberg Terminal Header */}
        <Header onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

        {/* Main Terminal Shell: Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />

          {/* Dynamic Content Viewport */}
          <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 select-text">
            {children}
          </main>
        </div>

        {/* Global Keyboard Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={handleCloseCommandPalette}
        />
      </div>
    </Providers>
  );
}
