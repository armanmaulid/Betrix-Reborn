'use client';

import { useQuery } from '@tanstack/react-query';
import { newsRepository } from '@/modules/news/infrastructure/repositories/HttpNewsRepository';
import { newsKeys } from '@/modules/news/application/news.keys';
import { useAdminMutation } from '@/shared/application/useAdminMutation';
import type { NewsArticle } from '@/modules/news/domain/entities/NewsArticle';
import type { PaginatedResult } from '@/shared/domain/types/Pagination';
import type { NewsQueryParams } from '@/modules/news/domain/repositories/INewsRepository';

export function useNewsQuery(params?: NewsQueryParams & { search?: string }) {
  return useQuery<PaginatedResult<NewsArticle>>({
    queryKey: newsKeys.feed(params as Record<string, unknown>),
    queryFn: () => newsRepository.getNews(params),
    staleTime: 30 * 1000
  });
}

export function usePollNewsMutation() {
  return useAdminMutation(
    (category: string = 'general') => newsRepository.pollNews(category),
    [newsKeys.all]
  );
}

export function useDeleteNewsMutation() {
  return useAdminMutation((id: string) => newsRepository.deleteNews(id), [newsKeys.all]);
}

export function useBatchDeleteNewsMutation() {
  return useAdminMutation((ids: string[]) => newsRepository.batchDeleteNews(ids), [newsKeys.all]);
}
