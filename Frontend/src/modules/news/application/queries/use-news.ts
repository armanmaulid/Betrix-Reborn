'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsRepository } from '@news/infrastructure/repositories/HttpNewsRepository';
import { newsKeys } from '@news/application/news.keys';
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: string = 'general') => {
      return apiFetch('/api/admin/news/poll', {
        method: 'POST',
        body: JSON.stringify({ category })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: newsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}
