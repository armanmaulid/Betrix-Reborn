'use client';

import React, { useMemo } from 'react';
import { useSystemMetrics } from '@/modules/analytics/application/queries/use-metrics';
import { useOpsStream } from '@/modules/analytics/application/queries/use-ops-stream';
import { useWorkersQuery } from '@/modules/operations/application/queries/use-workers';
import {
  TelemetryContext,
  type TelemetryState
} from '@/shared/presentation/layout/status-bar/telemetry-context';

/**
 * Composition root for the status bar's live telemetry.
 *
 * Lives in the app layer (not `shared/`) because it must import feature
 * modules — the status bar cards/items below it are presentational and consume
 * the context instead, keeping the shared layer free of `modules/*` deps.
 *
 * Single observer for each query key: the previous design had every card and
 * item polling independently (N×15s for metrics, N×10s for workers); hosting
 * the hooks here collapses that to one interval per stream.
 *
 * The ops SSE stream is opened here (not per-page), so the status bar stays
 * live on every dashboard route, not just the overview page. Metrics therefore
 * need no polling: the query fetches once for the initial value, then the
 * stream writes frames straight into the cache. Workers have no SSE channel,
 * so they keep polling.
 */
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const metricsQuery = useSystemMetrics();
  const { connected: metricsStreaming } = useOpsStream();
  const workersQuery = useWorkersQuery(10000);

  const value = useMemo<TelemetryState>(
    () => ({
      metrics: metricsQuery.metrics ?? null,
      metricsLoading: metricsQuery.isLoading,
      metricsError: metricsQuery.isError,
      metricsStreaming,
      workers: workersQuery.data ?? [],
      workersLoading: workersQuery.isLoading,
      workersError: workersQuery.isError
    }),
    [
      metricsQuery.metrics,
      metricsQuery.isLoading,
      metricsQuery.isError,
      metricsStreaming,
      workersQuery.data,
      workersQuery.isLoading,
      workersQuery.isError
    ]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}
