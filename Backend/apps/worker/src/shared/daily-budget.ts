/**
 * W7 — UTC-day-budget counter. Centralizes the per-day quota bookkeeping
 * that was previously inlined in `CalendarWorker.consumeDailyBudget()`.
 *
 * Behaviour:
 *   - Counter resets to 0 at UTC-midnight rollover (compared on `getUTCDate()`).
 *   - `consume(n)` returns `true` and increments if the budget allows the
 *     call, otherwise returns `false` without mutating the counter.
 *   - Pure in-memory (single-process). Multi-replica deployments should
 *     switch to a Redis-counter (see `sse.plugin.ts#consumeRedisBudget`
 *     for the per-replica pattern).
 */
export class DailyBudget {
  private dayUtc: number;
  private used: number;

  constructor(
    private readonly maxPerDay: number,
    now: Date = new Date()
  ) {
    this.dayUtc = now.getUTCDate();
    this.used = 0;
  }

  /** Try to consume `n` units. Returns `true` if allowed, `false` if it would exceed the daily cap. */
  consume(n: number, now: Date = new Date()): boolean {
    const today = now.getUTCDate();
    if (today !== this.dayUtc) {
      this.dayUtc = today;
      this.used = 0;
    }
    if (this.used + n > this.maxPerDay) return false;
    this.used += n;
    return true;
  }

  /** Inspect current usage (for tests / diagnostics). */
  get usedToday(): number {
    return this.used;
  }
}
