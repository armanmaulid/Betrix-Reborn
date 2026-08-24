'use client';

import { useEffect } from 'react';

export const BASE_TITLE = 'BETRIX // ADMIN TERMINAL';

export function formatPageTitle(subTitle?: string): string {
  if (!subTitle || !subTitle.trim()) return BASE_TITLE;
  const trimmed = subTitle.trim();
  return trimmed.startsWith('BETRIX //')
    ? trimmed
    : `BETRIX // ${trimmed.toUpperCase()}`;
}

export function usePageTitle(subTitle?: string) {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = formatPageTitle(subTitle);
    }
  }, [subTitle]);
}
