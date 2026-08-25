'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function useUtcClock() {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + ' UTC');
    };

    updateTime();
    const interval: ReturnType<typeof setInterval> | null = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        updateTime();
      }
    }, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateTime();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return utcTime;
}

/**
 * Isolated UTC Clock component to prevent 1-second ticks
 * from causing parent StatusBar and TelemetryDrawer re-renders.
 */
export const UtcClockDisplay = React.memo(function UtcClockDisplay() {
  const utcTime = useUtcClock();

  return (
    <div
      className="flex items-center space-x-1.5 shrink-0 text-muted-foreground"
      title="Global Precision UTC Clock"
    >
      <Clock className="w-2.5 h-2.5 text-info" />
      <span className="text-foreground tabular-nums">{utcTime || 'UTC'}</span>
    </div>
  );
});
