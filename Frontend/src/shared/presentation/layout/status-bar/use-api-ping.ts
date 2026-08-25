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

      // Apply result only if this ping is still the latest one.
      if (abortControllerRef.current === controller) {
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
      const isSuperseded = abortControllerRef.current !== controller;
      if (!isSuperseded) {
        // This controller is still current: either a network error or our own
        // 6s hard timeout fired — both mean the backend is unreachable.
        setApiStatus('offline');
        setLatencyMs(null);
      }
    }
  }, []);

  useEffect(() => {
    // Initial ping on mount
    pingApi();

    const timer: ReturnType<typeof setInterval> | null = setInterval(() => {
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
      // Null the ref first so the aborted ping's catch block treats itself as
      // superseded and does not flip the status after unmount.
      const current = abortControllerRef.current;
      abortControllerRef.current = null;
      current?.abort();
    };
  }, [intervalMs, pingApi]);

  return { apiStatus, latencyMs };
}
