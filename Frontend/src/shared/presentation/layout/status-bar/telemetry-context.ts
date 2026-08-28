'use client';

import { createContext, useContext } from 'react';
import type { WorkerLike } from '@/shared/utils';

/**
 * Structural view of the system metrics fed to the status bar. Kept here in
 * the shared layer (instead of importing `SystemMetrics` from the analytics
 * module) so that shared components never depend on feature modules — the
 * concrete shape is provided at runtime by the telemetry host in the app layer.
 */
export interface SystemMetricsLike {
  dbPoolActive?: number;
  dbPoolIdle?: number;
  uptimeSeconds?: number;
  activeSessions?: number;
  redisStatus?: string;
  redisLatencyMs?: number;
}

export interface TelemetryState {
  metrics: SystemMetricsLike | null;
  metricsLoading: boolean;
  metricsError: boolean;
  /** True while the ops SSE channel is connected (metrics arrive via push). */
  metricsStreaming: boolean;
  workers: WorkerLike[];
  workersLoading: boolean;
  workersError: boolean;
}

const TelemetryContext = createContext<TelemetryState | null>(null);

export function useTelemetry(): TelemetryState {
  const ctx = useContext(TelemetryContext);
  // Default to an empty state so shared components render (empty/loading
  // placeholders) even without a provider — required by unit tests and any
  // future render path that doesn't mount the telemetry host.
  return (
    ctx ?? {
      metrics: null,
      metricsLoading: false,
      metricsError: false,
      metricsStreaming: false,
      workers: [],
      workersLoading: false,
      workersError: false
    }
  );
}

export { TelemetryContext };
