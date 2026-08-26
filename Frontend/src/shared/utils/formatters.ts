/**
 * Core Financial and Date Formatters
 */

export function formatFinancialNumber(val: number, decimals: number = 0): string {
  // Missing/broken data renders as an em-dash so it can never be mistaken for
  // a legitimate zero value in gauges, counters, or tables.
  if (val === undefined || val === null || Number.isNaN(val)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(val);
}

export function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

export function formatDate(date: string | number | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'N/A';
    // Values are normalized to UTC everywhere; label it so operators are never guessing.
    return d.toISOString().substring(0, 10) + ' UTC';
  } catch {
    return 'N/A';
  }
}

export function formatDateTime(date: string | number | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'N/A';
    return d.toISOString().substring(0, 19).replace('T', ' ') + ' UTC';
  } catch {
    return 'N/A';
  }
}

export function formatUtcNewsDate(timestamp: number | null | undefined): string {
  if (!timestamp) return 'UNKNOWN';
  try {
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) return 'UNKNOWN';
    return (
      date.toLocaleString('en-US', {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }) + ' UTC'
    );
  } catch {
    return 'UNKNOWN';
  }
}
