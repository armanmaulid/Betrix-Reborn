'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TelemetryDrawer } from './telemetry-drawer';
import { StatusBarStrip } from './status-bar-strip';

export function StatusBar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handleToggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  // Global Escape Key Listener to dismiss drawer
  useEffect(() => {
    if (!isDrawerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isDrawerOpen]);

  return (
    <>
      <TelemetryDrawer isOpen={isDrawerOpen} onClose={handleCloseDrawer} />
      <StatusBarStrip isDrawerOpen={isDrawerOpen} onToggleDrawer={handleToggleDrawer} />
    </>
  );
}
