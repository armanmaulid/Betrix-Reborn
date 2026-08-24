/**
 * Chart palette resolved from the global CSS theme tokens (globals.css).
 * Using `var(--color-*)` keeps Recharts fills/strokes in lockstep with the
 * Tailwind theme — there is exactly one color source for the whole app.
 */
export const CHART_COLORS = {
  accent: 'var(--color-accent)',
  accentDim: 'var(--color-accent-dim)',
  positive: 'var(--color-positive)',
  negative: 'var(--color-negative)',
  info: 'var(--color-info)',
  border: 'var(--color-border)',
  surface: 'var(--color-surface)',
  text: 'var(--color-foreground)',
  mutedText: 'var(--color-muted-foreground)'
} as const;
