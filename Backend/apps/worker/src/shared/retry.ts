import { setTimeout } from 'node:timers/promises';

/**
 * W1 + W6 — shared retry / backoff helpers used by the worker.
 *
 * W6 — `backoffDelay(attempt, baseMs, maxMs)` returns `min(baseMs * attempt, maxMs)`.
 *      Used by the WS reconnect loop (`ws-worker.ts`) to cap reconnect delay.
 * W1 — `retry(fn, { times, delayMs, onRetry })` runs `fn` up to `times`
 *      attempts; on failure waits `delayMs` and re-tries, logging via
 *      `onRetry` between attempts. Re-throws the last error if all attempts
 *      fail. Used by `sync-worker.ts` to wait out Dukascopy's publish delay.
 */

export function backoffDelay(attempt: number, baseMs: number, maxMs: number): number {
  return Math.min(baseMs * attempt, maxMs);
}

export interface RetryOptions {
  times: number;
  delayMs: number;
  onRetry?: (err: unknown, attempt: number) => void;
}

export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= opts.times; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt < opts.times) {
        opts.onRetry?.(err, attempt);
        await setTimeout(opts.delayMs);
      }
    }
  }
  throw lastErr;
}

/**
 * W1 (partial) — sleeps `delayMs` after attempt N (1-indexed). Used by
 * custom-predicate retry loops (e.g. retry until a polled value matches an
 * expectation) that can't use the standard `retry()` because success is not
 * "no throw" but "predicate satisfied".
 */
export async function retrySleep(delayMs: number): Promise<void> {
  await setTimeout(delayMs);
}
