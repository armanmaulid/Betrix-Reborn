'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/shared/presentation/ui/terminal-toast';

export function useLogout() {
  const router = useRouter();
  const { success, error } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(
    async (options?: { onBeforeLogout?: () => void }) => {
      if (options?.onBeforeLogout) {
        options.onBeforeLogout();
      }
      setIsLoggingOut(true);
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          signal: AbortSignal.timeout(10000)
        });
        success('SESSION TERMINATED', 'Administrator logged out cleanly.');
        // Give the toast viewport a beat to paint before the dashboard shell
        // (which hosts it) unmounts on navigation.
        setTimeout(() => {
          router.push('/login');
          router.refresh();
        }, 600);
      } catch {
        error('LOGOUT FAILED', 'Unable to reach logout endpoint.');
      } finally {
        setIsLoggingOut(false);
      }
    },
    [router, success, error]
  );

  return {
    logout,
    isLoggingOut
  };
}
