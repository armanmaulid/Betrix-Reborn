'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NewsArticle, NewsQueryParams, PaginatedResult } from '@/lib/types';

export function useNewsQuery(params?: NewsQueryParams) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.category && params.category !== 'all') searchParams.set('category', params.category);
  if (params?.tag) searchParams.set('tag', params.tag);

  const queryString = searchParams.toString();

  return useQuery<PaginatedResult<NewsArticle>>({
    queryKey: ['news', params],
    queryFn: async () => {
      const res = await fetch(`/api/news${queryString ? `?${queryString}` : ''}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch news: ${res.statusText}`);
      }
      const json = await res.json();
      return {
        data: json.data || [],
        meta: json.meta || { page: 1, limit: 20, total: 0, totalPages: 1 }
      };
    },
    staleTime: 30 * 1000 // 30 seconds
  });
}

export function usePollNewsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: string = 'general') => {
      const res = await fetch('/api/admin/news/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to trigger Finnhub news poll.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    }
  });
}
