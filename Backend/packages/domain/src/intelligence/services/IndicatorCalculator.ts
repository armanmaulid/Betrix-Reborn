export interface RawCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorSummary {
  sma20?: number;
  sma50?: number;
  ema20?: number;
  rsi14?: number;
  atr14?: number;
  macd?: { macd: number; signal: number; histogram: number };
  supportLevels: number[];
  resistanceLevels: number[];
  recentHigh: number;
  recentLow: number;
}

export class IndicatorCalculator {
  public static calculateSMA(prices: number[], period: number): number | undefined {
    if (prices.length < period) return undefined;
    const slice = prices.slice(-period);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return Number((sum / period).toFixed(5));
  }

  public static calculateEMA(prices: number[], period: number): number | undefined {
    if (prices.length < period) return undefined;
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((acc, v) => acc + v, 0) / period;
    for (let i = period; i < prices.length; i++) {
      ema = prices[i]! * k + ema * (1 - k);
    }
    return Number(ema.toFixed(5));
  }

  public static calculateRSI(prices: number[], period: number = 14): number | undefined {
    if (prices.length < period + 1) return undefined;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = prices[i]! - prices[i - 1]!;
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
      const diff = prices[i]! - prices[i - 1]!;
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    return Number(rsi.toFixed(2));
  }

  public static calculateATR(candles: RawCandle[], period: number = 14): number | undefined {
    if (candles.length < period + 1) return undefined;

    const trs: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i]!;
      const prev = candles[i - 1]!;
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - prev.close),
        Math.abs(current.low - prev.close)
      );
      trs.push(tr);
    }

    let atr = trs.slice(0, period).reduce((acc, v) => acc + v, 0) / period;
    for (let i = period; i < trs.length; i++) {
      atr = (atr * (period - 1) + trs[i]!) / period;
    }

    return Number(atr.toFixed(5));
  }

  public static calculateSupportResistance(
    candles: RawCandle[],
    lookback: number = 20
  ): {
    supports: number[];
    resistances: number[];
    recentHigh: number;
    recentLow: number;
  } {
    const slice = candles.slice(-lookback);
    const highs = slice.map((c) => c.high);
    const lows = slice.map((c) => c.low);

    const recentHigh = Math.max(...highs);
    const recentLow = Math.min(...lows);

    const supports: number[] = [];
    const resistances: number[] = [];

    // Local swing detection (3-bar fractal)
    for (let i = 2; i < slice.length - 2; i++) {
      const current = slice[i]!;
      if (
        current.high > slice[i - 1]!.high &&
        current.high > slice[i - 2]!.high &&
        current.high > slice[i + 1]!.high &&
        current.high > slice[i + 2]!.high
      ) {
        resistances.push(Number(current.high.toFixed(5)));
      }

      if (
        current.low < slice[i - 1]!.low &&
        current.low < slice[i - 2]!.low &&
        current.low < slice[i + 1]!.low &&
        current.low < slice[i + 2]!.low
      ) {
        supports.push(Number(current.low.toFixed(5)));
      }
    }

    return {
      supports: [...new Set(supports)],
      resistances: [...new Set(resistances)],
      recentHigh: Number(recentHigh.toFixed(5)),
      recentLow: Number(recentLow.toFixed(5))
    };
  }
}
