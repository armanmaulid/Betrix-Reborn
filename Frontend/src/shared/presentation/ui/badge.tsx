import React from 'react';

export type BadgeTone = 'accent' | 'accent-soft' | 'neutral' | 'positive' | 'negative' | 'warning';

/**
 * Single source of truth for the app's pill/badge language. Replaces the
 * copy-pasted `px-2 py-0.5 text-[9px] font-bold border uppercase …` literals
 * found across tables/cards. Entity-provided full class strings (e.g.
 * getStatusBadgeClass()) can migrate by mapping their status to a tone here.
 */
const BADGE_TONES: Record<BadgeTone, string> = {
  accent: 'border-accent bg-accent text-black',
  'accent-soft': 'border-accent/40 bg-accent/10 text-accent',
  neutral: 'border-border bg-black text-muted-foreground',
  positive: 'border-positive bg-positive/10 text-positive',
  negative: 'border-negative bg-negative/10 text-negative',
  warning: 'border-warning bg-warning/10 text-warning'
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  /** Extra classes appended last (e.g. animate-pulse) — never for colouring. */
  className?: string;
}

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold border uppercase ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
