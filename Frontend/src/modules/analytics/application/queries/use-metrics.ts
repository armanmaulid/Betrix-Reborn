'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';
import { analyticsRepository } from '@analytics/infrastructure/repositories/HttpAnalyticsRepository';
import { analyticsKeys } from '@analytics/application/analytics.keys';
import type { SystemMetrics } from '@analytics/domain/entities/SystemMetrics';

export function useSystemMetrics(refetchInterval: number = 15000) {
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
    const deltas = {
      totalUsers: 0,
      activeSessions: 0,
      totalChats: 0,
      totalTokensUsed: 0
    };
    if (data && prev) {
      deltas.totalUsers = data.totalUsers - prev.totalUsers;
      deltas.activeSessions = data.activeSessions - prev.activeSessions;
      deltas.totalChats = data.totalChats - prev.totalChats;
      deltas.totalTokensUsed = data.totalTokensUsed - prev.totalTokensUsed;
    }
    if (data) previousRef.current = data;
    return deltas;
  }, [data]);

  return {
    ...query,
    metrics: data,
    deltas
  };
}
