'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Providers } from './providers';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { StatusBar } from './status-bar';
import { CommandPalette } from './command-palette';
import { ROUTE_SHORTCUT_MAP } from '@/shared/utils/routes';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      const activeEl = document.activeElement;
      const isTyping =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        // contenteditable="" and "plaintext-only" are valid editing states too
        (activeEl !== null && 'isContentEditable' in activeEl && activeEl.isContentEditable);

      if (isTyping || isCommandPaletteOpen) {
        return;
      }

      if (
        (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B'))
      ) {
        e.preventDefault();
        handleToggleSidebar();
        return;
      }

      const key = e.key;
      const targetRoute = ROUTE_SHORTCUT_MAP[key];

      if (targetRoute && (e.altKey || (!e.ctrlKey && !e.metaKey && !e.shiftKey))) {
        e.preventDefault();
        router.push(targetRoute);
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
          <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={handleToggleSidebar} />

          {/* Dynamic Content Viewport */}
          <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 select-text">
            {children}
          </main>
        </div>

        {/* Centralized Bottom Terminal Status Bar */}
        <StatusBar />

        {/* Global Keyboard Command Palette */}
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={handleCloseCommandPalette} />
      </div>
    </Providers>
  );
}
