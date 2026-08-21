/**
 * Bloomberg Terminal Chart Color Mapping
 * Synchronized with app/globals.css CSS custom properties
 */

export const CHART_COLORS = {
  accent: '#FF8000',      // Bloomberg signature orange
  accentDim: '#B35900',   // Dimmed orange for secondary strokes
  positive: '#00D964',    // Terminal green for upward growth
  negative: '#FF3B30',    // Terminal red for downward indicators
  info: '#4A9EFF',        // Cyan blue for reference series
  border: '#1A1A1A',      // Subtle grid line border
  surface: '#0A0A0A',     // Card surface background
  text: '#E8E8E8',        // High contrast text
  mutedText: '#888888'    // Axis labels
} as const;

/**
 * Dynamically resolves a CSS custom property from document root if available,
 * falling back to pre-defined Bloomberg token values.
 */
export function getTerminalColor(varName: string, fallbackKey: keyof typeof CHART_COLORS): string {
  if (typeof window !== 'undefined') {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (val) return val;
  }
  return CHART_COLORS[fallbackKey];
}
