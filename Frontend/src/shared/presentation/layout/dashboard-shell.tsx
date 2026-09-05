'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { StatusBar } from './status-bar';
import { CommandPalette } from './command-palette';
import { useIsMobile } from '@/shared/presentation/hooks/use-is-mobile';
import { ROUTE_SHORTCUT_MAP } from '@/shared/utils/routes';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('betrix_sidebar_collapsed');
      if (saved === 'true') {
        setIsSidebarCollapsed(true);
      }
    } catch {}
  }, []);

  // Close the mobile drawer when the viewport crosses back above `md`.
  useEffect(() => {
    if (!isMobile) {
      setIsMobileNavOpen(false);
    }
  }, [isMobile]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!isMobileNavOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isMobileNavOpen]);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('betrix_sidebar_collapsed', next.toString());
      } catch {}
      return next;
    });
  }, []);

  const handleOpenMobileNav = useCallback(() => {
    setIsMobileNavOpen(true);
  }, []);

  const handleCloseMobileNav = useCallback(() => {
    setIsMobileNavOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape' && isMobileNavOpen) {
        e.preventDefault();
        setIsMobileNavOpen(false);
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
  }, [router, isCommandPaletteOpen, isMobileNavOpen, handleToggleSidebar]);

  const handleCloseCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  return (
    <div className="flex flex-col h-screen h-dvh w-full overflow-hidden bg-background text-foreground select-none">
      {/* Top Bloomberg Terminal Header */}
      <Header
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleMobileNav={handleOpenMobileNav}
      />

      {/* Main Terminal Shell: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar (md+) is in-flow; below md it is a fixed slide-over. */}
        {isMobile ? (
          <div
            className={`fixed inset-0 z-40 ${isMobileNavOpen ? '' : 'pointer-events-none'}`}
            aria-hidden={!isMobileNavOpen}
          >
            <div
              onClick={handleCloseMobileNav}
              className={`absolute inset-0 bg-black/60 transition-opacity ${
                isMobileNavOpen ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <div
              className={`relative h-full transition-transform duration-150 ${
                isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <Sidebar
                variant="drawer"
                onToggleCollapse={handleCloseMobileNav}
                onNavigate={handleCloseMobileNav}
              />
            </div>
          </div>
        ) : (
          <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={handleToggleSidebar} />
        )}

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
  );
}
