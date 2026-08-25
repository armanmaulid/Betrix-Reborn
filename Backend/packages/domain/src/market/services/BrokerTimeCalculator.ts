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
   * Returns a standard 5-part cron expression that triggers 5 seconds after Broker Midnight Rollover.
   * Example: UTC+3 offset -> '5 0 21 * * *' (21:00:05 UTC every day)
   */
  public static getBrokerRolloverCronExpression(offsetHours: number = 3): string {
    const rolloverUtcHour = this.getBrokerRolloverUtcHour(offsetHours);
    return `5 ${rolloverUtcHour} * * *`;
  }

  /**
   * Calculates the exact remaining seconds until the next Broker Midnight Rollover (+ optional buffer).
   * This provides dynamic, accurate TTL for D1 baselines in Redis instead of rigid hardcoded 24h (86400s).
   */
  public static calculateTtlToNextBrokerRollover(
    offsetHours: number = 3,
    bufferSeconds: number = 60,
    fromDate: Date = new Date()
  ): number {
    const rolloverUtcHour = this.getBrokerRolloverUtcHour(offsetHours);

    // Target rollover point today in UTC
    const target = new Date(fromDate);
    target.setUTCHours(rolloverUtcHour, 0, 5, 0); // 5s past rollover hour

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
