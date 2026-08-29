/**
 * Domain Service: BrokerTimeCalculator
 * Calculates Broker Midnight Rollover, Cron schedules, and dynamic Redis TTLs
 * based on the Broker's UTC offset (e.g. UTC+3 for EET Summer / UTC+2 Winter).
 */
export class BrokerTimeCalculator {
  /**
   * Returns the UTC hour corresponding to 00:00:00 Broker Server Time.
   * Example: UTC+3 offset -> 21 (21:00 UTC)
   * Example: UTC+2 offset -> 22 (22:00 UTC)
   */
  public static getBrokerRolloverUtcHour(offsetHours: number = 3): number {
    const normOffset = Math.floor(offsetHours);
    return (((24 - (normOffset % 24)) % 24) + 24) % 24;
  }

  /**
   * Returns a standard 5-part cron expression that triggers `publishDelayMinutes`
   * after Broker Midnight Rollover, plus a small per-worker stagger so workers
   * sharing the same rollover don't all fire in the same minute.
   *
   * `publishDelayMinutes` exists because the D1 candle for "yesterday" only
   * closes at the rollover instant itself — Dukascopy (and most OHLC
   * providers) need real processing time afterward before that candle is
   * queryable. Firing right at rollover risks reading a not-yet-published
   * candle, which silently returns the PREVIOUS available bar (i.e. two days
   * ago) as the last element instead. See syncD1Baselines' date-validated
   * retry for the safety net that catches this if the delay isn't enough.
   *
   * Example: UTC+3 offset, default delay -> '5 21 * * *' (21:05:00 UTC, i.e.
   * 5 minutes after 21:00 UTC rollover).
   */
  public static getBrokerRolloverCronExpression(
    offsetHours: number = 3,
    jitterMinutes: number = 0,
    publishDelayMinutes: number = 5
  ): string {
    const rolloverUtcHour = this.getBrokerRolloverUtcHour(offsetHours);
    const totalDelay = (Number(publishDelayMinutes) || 0) + (Number(jitterMinutes) || 0);
    const hourOffset = Math.floor(totalDelay / 60);
    const minute = totalDelay % 60;
    const hour = (rolloverUtcHour + hourOffset) % 24;
    return `${minute} ${hour} * * *`;
  }

  /**
   * Calculates the exact remaining seconds until the next Broker Midnight Rollover
   * sync actually runs (i.e. rollover + publishDelayMinutes, matching
   * getBrokerRolloverCronExpression), plus an optional safety buffer. This
   * provides dynamic, accurate TTL for D1 baselines in Redis instead of a
   * rigid hardcoded 24h (86400s) — and keeps the TTL anchored to when the
   * sync actually writes fresh data, not to the raw calendar rollover instant.
   */
  public static calculateTtlToNextBrokerRollover(
    offsetHours: number = 3,
    bufferSeconds: number = 60,
    fromDate: Date = new Date(),
    publishDelayMinutes: number = 5
  ): number {
    const rolloverUtcHour = this.getBrokerRolloverUtcHour(offsetHours);

    // Target: the actual sync run time today (rollover + publish delay), not
    // the raw rollover instant — the two are no longer the same moment now
    // that the sync itself waits for the provider to publish yesterday's candle.
    const target = new Date(fromDate);
    target.setUTCHours(rolloverUtcHour, Number(publishDelayMinutes) || 0, 5, 0);

    // If target has already passed today, target is next day
    if (target.getTime() <= fromDate.getTime()) {
      target.setUTCDate(target.getUTCDate() + 1);
    }

    const remainingSec = Math.floor((target.getTime() - fromDate.getTime()) / 1000);
    return Math.max(300, remainingSec + bufferSeconds);
  }

  /**
   * Converts a given UTC Date to Broker Server Time representation.
   */
  public static getBrokerDate(utcDate: Date = new Date(), offsetHours: number = 3): Date {
    return new Date(utcDate.getTime() + offsetHours * 3600 * 1000);
  }

  /**
   * Checks whether the current broker time falls in weekend market closure
   * (Saturday 00:00 Broker Time to Sunday 23:59 Broker Time).
   */
  public static isBrokerMarketWeekend(
    utcDate: Date = new Date(),
    offsetHours: number = 3
  ): boolean {
    const brokerDate = this.getBrokerDate(utcDate, offsetHours);
    const day = brokerDate.getUTCDay(); // 0 = Sunday, 6 = Saturday in broker perspective
    return day === 0 || day === 6;
  }
}
