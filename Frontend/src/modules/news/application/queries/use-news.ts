'use client';

import { useQuery } from '@tanstack/react-query';
import { newsRepository } from '@news/infrastructure/repositories/HttpNewsRepository';
import { newsKeys } from '@news/application/news.keys';
import { useAdminMutation } from '@shared/application/useAdminMutation';
import type { NewsArticle } from '@news/domain/entities/NewsArticle';
import type { PaginatedResult } from '@shared/domain/types/Pagination';
import type { NewsQueryParams } from '@news/domain/repositories/INewsRepository';
import { apiFetch } from '@shared/infrastructure/http/api-client';

export function useNewsQuery(params?: NewsQueryParams & { search?: string }) {
  return useQuery<PaginatedResult<NewsArticle>>({
    queryKey: newsKeys.feed(params as Record<string, unknown>),
    queryFn: () => newsRepository.getNews(params),
    staleTime: 30 * 1000
  });
}

export function usePollNewsMutation() {
  return useAdminMutation(
    (category: string = 'general') =>
      apiFetch('/api/admin/news/poll', {
        method: 'POST',
        body: JSON.stringify({ category })
      }),
    [newsKeys.all]
  );
}

export function useDeleteNewsMutation() {
  return useAdminMutation(
    (id: string) => newsRepository.deleteNews(id),
    [newsKeys.all]
  );
}

export function useBatchDeleteNewsMutation() {
  return useAdminMutation(
    (ids: string[]) => newsRepository.batchDeleteNews(ids),
    [newsKeys.all]
  );
}

