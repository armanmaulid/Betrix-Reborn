'use client';

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * True when the viewport is narrower than the `md` breakpoint (768px) — the
 * point below which the desktop sidebar collapses into a slide-over drawer.
 *
 * Initialized to `false` so the first client render matches the server render
 * (no hydration mismatch); the value is corrected in a mount effect.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
