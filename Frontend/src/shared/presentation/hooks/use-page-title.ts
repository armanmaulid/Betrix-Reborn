'use client';

import { useEffect, useRef } from 'react';

export const BASE_TITLE = 'BETRIX // ADMIN TERMINAL';

export function formatPageTitle(subTitle?: string): string {
  if (!subTitle || !subTitle.trim()) return BASE_TITLE;
  const trimmed = subTitle.trim();
  return trimmed.startsWith('BETRIX //')
    ? trimmed
    : `BETRIX // ${trimmed.toUpperCase()}`;
}

export function usePageTitle(subTitle?: string) {
  const currentTitleRef = useRef<string>('');

  useEffect(() => {
    const formatted = formatPageTitle(subTitle);
    currentTitleRef.current = formatted;

    if (typeof document !== 'undefined') {
      document.title = formatted;
    }

    return () => {
      if (typeof document !== 'undefined' && document.title === currentTitleRef.current) {
        // Leave intact to avoid brief flash during route transitions
      }
    };
  }, [subTitle]);
}
