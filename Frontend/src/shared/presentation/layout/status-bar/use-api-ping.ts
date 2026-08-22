'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type ApiHealthStatus = 'online' | 'connecting' | 'offline';

export function useApiPing(intervalMs: number = 30000) {
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiHealthStatus>('connecting');
  const abortControllerRef = useRef<AbortController | null>(null);

  const pingApi = useCallback(async () => {
    // Abort previous in-flight ping if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s hard network timeout

    const start = performance.now();
    try {
      const res = await fetch('/api/auth/session', {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - start);

      if (!controller.signal.aborted) {
        if (res.ok) {
          setApiStatus('online');
          setLatencyMs(latency);
        } else {
          setApiStatus('offline');
          setLatencyMs(null);
        }
      }
    } catch {
      clearTimeout(timeoutId);
      if (!controller.signal.aborted) {
        setApiStatus('offline');
        setLatencyMs(null);
      }
    }
  }, []);

  useEffect(() => {
    // Initial ping on mount
    pingApi();

    let timer: ReturnType<typeof setInterval> | null = setInterval(() => {
      // Only ping if tab is active/visible
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        pingApi();
      }
    }, intervalMs);

    // Re-ping immediately when user switches back to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pingApi();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [intervalMs, pingApi]);

  return { apiStatus, latencyMs };
}
