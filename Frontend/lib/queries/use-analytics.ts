'use client';

import { useQuery } from '@tanstack/react-query';
import type { UserAnalytics, AnalyticsQueryParams } from '@/lib/types';

export function useUserAnalytics(params?: AnalyticsQueryParams) {
  const searchParams = new URLSearchParams();
  if (params?.period) searchParams.set('period', params.period);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);

  const queryString = searchParams.toString();

  return useQuery<UserAnalytics>({
    queryKey: ['admin', 'analytics', params],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics${queryString ? `?${queryString}` : ''}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch analytics: ${res.statusText}`);
      }
      const json = await res.json();
      return json.data || json;
    },
    staleTime: 60 * 1000 // 1 minute
  });
}

