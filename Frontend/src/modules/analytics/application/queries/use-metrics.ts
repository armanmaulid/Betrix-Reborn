'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef, useEffect } from 'react';
import { analyticsRepository } from '@analytics/infrastructure/repositories/HttpAnalyticsRepository';
import { analyticsKeys } from '@analytics/application/analytics.keys';
import type { SystemMetrics } from '@analytics/domain/entities/SystemMetrics';

/**
 * Metrics now arrive via the ops SSE stream (use-ops-stream writes straight
 * into this query's cache), so polling defaults OFF. The parameter stays for
 * manual opt-in / tests.
 */
export function useSystemMetrics(refetchInterval: number | false = false) {
  const previousRef = useRef<SystemMetrics | null>(null);

  const query = useQuery<SystemMetrics>({
    queryKey: analyticsKeys.metrics(),
    queryFn: () => analyticsRepository.getSystemMetrics(),
    refetchInterval,
    refetchIntervalInBackground: false
  });

  const data = query.data;

  const deltas = useMemo(() => {
    const prev = previousRef.current;
    const result = {
      totalUsers: 0,
      activeSessions: 0,
      totalChats: 0,
      totalTokensUsed: 0
    };
    if (data && prev) {
      result.totalUsers = data.totalUsers - prev.totalUsers;
      result.activeSessions = data.activeSessions - prev.activeSessions;
      result.totalChats = data.totalChats - prev.totalChats;
      result.totalTokensUsed = data.totalTokensUsed - prev.totalTokensUsed;
    }
    return result;
  }, [data]);

  // Update ref in useEffect (not inside useMemo) to avoid StrictMode double-invoke bug
  useEffect(() => {
    if (data) previousRef.current = data;
  }, [data]);

  return {
    ...query,
    metrics: data,
    deltas
  };
}
