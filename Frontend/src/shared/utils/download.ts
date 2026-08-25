/**
 * Browser download helper — kept in shared/utils so application-layer hooks
 * never manipulate the DOM directly.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Filesystem-safe timestamp for export filenames (UTC, no spaces):
 * `2026-08-25T044102Z`
 */
export function fileTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '').replace('T', 'T').slice(0, 16) + 'Z';
}
