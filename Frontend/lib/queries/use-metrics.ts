'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';
import type { SystemMetrics } from '@/lib/types';

export interface MetricsWithDelta {
  metrics: SystemMetrics;
  deltas: {
    totalUsers: number;
    activeSessions: number;
    totalChats: number;
    totalTokensUsed: number;
  };
}

export function useSystemMetrics(refetchInterval: number = 15000) {
  const previousRef = useRef<SystemMetrics | null>(null);
  const deltasRef = useRef<{
    totalUsers: number;
    activeSessions: number;
    totalChats: number;
    totalTokensUsed: number;
  }>({
    totalUsers: 0,
    activeSessions: 0,
    totalChats: 0,
    totalTokensUsed: 0
  });

  const query = useQuery<SystemMetrics>({
    queryKey: ['admin', 'metrics'],
    queryFn: async () => {
      const res = await fetch('/api/admin/metrics');
      if (!res.ok) {
        throw new Error(`Failed to fetch metrics: ${res.statusText}`);
      }
      const json = await res.json();
      return json.data || json;
    },
    refetchInterval,
    refetchIntervalInBackground: false
  });

  useEffect(() => {
    if (query.data) {
      if (previousRef.current) {
        deltasRef.current = {
          totalUsers: query.data.totalUsers - previousRef.current.totalUsers,
          activeSessions: query.data.activeSessions - previousRef.current.activeSessions,
          totalChats: query.data.totalChats - previousRef.current.totalChats,
          totalTokensUsed: query.data.totalTokensUsed - previousRef.current.totalTokensUsed
        };
      }
      previousRef.current = query.data;
    }
  }, [query.data]);

  return {
    ...query,
    metrics: query.data,
    deltas: deltasRef.current
  };
}
