'use client';

import { useQuery } from '@tanstack/react-query';

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  isAdmin: boolean;
  status: string;
}

export function useSession() {
  const { data, isLoading, isError, refetch } = useQuery<{
    authenticated: boolean;
    user?: SessionUser;
  }>({
    queryKey: ['auth', 'session'],
    queryFn: async ({ signal }) => {
      const res = await fetch('/api/auth/session', { signal });
      if (!res.ok) {
        return { authenticated: false };
      }
      const json = await res.json();
      return json?.data ?? { authenticated: false };
    },
    staleTime: 60 * 1000,
    retry: false
  });

  return {
    currentUser: data?.user ?? null,
    isAuthenticated: data?.authenticated ?? false,
    isLoading,
    isError,
    refetch
  };
}
