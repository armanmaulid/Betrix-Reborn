'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsRepository } from '@/modules/analytics/infrastructure/repositories/HttpAnalyticsRepository';
import { analyticsKeys } from '@/modules/analytics/application/analytics.keys';
import type {
  UserAnalytics,
  AnalyticsQueryParams
} from '@/modules/analytics/domain/entities/SystemMetrics';

export function useUserAnalytics(params?: AnalyticsQueryParams) {
  return useQuery<UserAnalytics>({
    queryKey: analyticsKeys.userAnalytics(params as Record<string, unknown>),
    queryFn: () => analyticsRepository.getUserAnalytics(params),
    staleTime: 60 * 1000
  });
}
