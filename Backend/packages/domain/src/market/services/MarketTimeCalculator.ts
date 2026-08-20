/**
 * Domain Service: MarketTimeCalculator
 * Pure domain logic for calculating historical data lookback windows.
 * No infrastructure dependencies — purely mathematical.
 */
export class MarketTimeCalculator {
  /**
   * Calculates how many calendar days of historical data are needed
   * to satisfy a given timeframe and candle count request.
   *
   * Example: h1 timeframe, 100 candles → need ~5 calendar days
   *          d1 timeframe, 30 candles → need ~60 calendar days
   */
  public static calculateLookbackDays(timeframe: string, limit: number): number {
    switch (timeframe) {
      case 'm1':
        return Math.max(2, Math.ceil((limit * 1) / (24 * 60)));
      case 'm5':
        return Math.max(3, Math.ceil((limit * 5) / (24 * 60)));
      case 'm15':
        return Math.max(5, Math.ceil((limit * 15) / (24 * 60)));
      case 'm30':
        return Math.max(7, Math.ceil((limit * 30) / (24 * 60)));
      case 'h1':
        return Math.max(10, Math.ceil((limit * 60) / (24 * 60)));
      case 'h4':
        return Math.max(30, Math.ceil((limit * 240) / (24 * 60)));
      case 'd1':
        return Math.max(60, limit * 2);
      case 'mn1':
      case 'mn':
        return Math.max(365, limit * 60);
      default:
        return 30;
    }
  }
}
