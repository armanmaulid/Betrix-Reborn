'use client';

import React, { useState } from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/shared/infrastructure/http/api-client';
import { ToastProvider } from '@/shared/presentation/ui/terminal-toast';

/**
 * Redirect to the login screen exactly once per hard navigation when the
 * session has expired. Without this, every polling query surfaces an error
 * toast forever after the cookie expires instead of bouncing the user out.
 */
function handleSessionExpiry(error: unknown): void {
  if (!(error instanceof ApiError) || error.status !== 401) return;
  if (typeof window === 'undefined') return;
  // Failed login attempts surface as 401 too — never bounce the login page.
  const current = window.location.pathname + window.location.search;
  if (current.startsWith('/login')) return;
  const w = window as Window & { __betrixSessionRedirect?: boolean };
  if (w.__betrixSessionRedirect) return;
  w.__betrixSessionRedirect = true;

  // Route through the clear-session handler: it wipes the httpOnly cookie
  // server-side, then lands on /login. Assigning /login directly would leave
  // the stale cookie intact, so proxy.ts would bounce us straight back to
  // /dashboard and re-trigger the 401 — an infinite loop after a password reset.
  window.location.assign(`/api/auth/clear-session?from=${encodeURIComponent(current)}`);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 1000,
            refetchOnWindowFocus: false,
            retry: 1
          }
        },
        queryCache: new QueryCache({ onError: handleSessionExpiry }),
        mutationCache: new MutationCache({ onError: handleSessionExpiry })
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
