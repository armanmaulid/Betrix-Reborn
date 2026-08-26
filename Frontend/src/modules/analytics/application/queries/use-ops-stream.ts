'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { analyticsKeys } from '../analytics.keys';

interface OpsSnapshot {
  metrics?: unknown;
  analytics?: unknown;
}

/**
 * Replaces dashboard polling with a server-pushed SSE feed. Every 'ops' frame
 * is written straight into the react-query cache, so components re-render with
 * fresh data WITHOUT any refetch spinner states — the flicker source around
 * the SYNC ALL button is gone entirely.
 *
 * EventSource reconnects natively with backoff; no manual retry loop needed.
 */
export function useOpsStream(): { connected: boolean } {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource('/api/admin/metrics/stream');

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener('ops', (event) => {
      try {
        const snap = JSON.parse((event as MessageEvent).data) as OpsSnapshot;
        if (snap.metrics) {
          queryClient.setQueryData(analyticsKeys.metrics(), snap.metrics);
        }
        if (snap.analytics) {
          // Dashboard reads analytics without params -> cache key is {}.
          queryClient.setQueryData(analyticsKeys.userAnalytics({}), snap.analytics);
        }
      } catch {
        // Malformed frame — skip; the next tick carries a full snapshot anyway.
      }
    });

    return () => {
      es.close();
    };
  }, [queryClient]);

  return { connected };
}
