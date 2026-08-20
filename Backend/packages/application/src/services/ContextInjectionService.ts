import { IndicatorCalculator, RawCandle } from '@betrix/domain';
import { MarketDataService } from './MarketDataService.js';
import { NewsService } from './NewsService.js';
import { MarketContextOptionsDTO } from '../schemas/chat.schema.js';

export interface InjectedContextResult {
  contextBlock: string;
  metadata: {
    symbol: string;
    timeframe: string;
    candlesLoaded: number;
    lastPrice?: number;
    indicatorsComputed: boolean;
    newsIncluded: number;
  };
}

export class ContextInjectionService {
  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly newsService?: NewsService
  ) {}

  public async buildMarketContext(options: MarketContextOptionsDTO): Promise<InjectedContextResult> {
    const symbol = options.symbol.toUpperCase();
    const timeframe = (options.timeframe || 'h1').toLowerCase();
    const candleCount = options.candleCount || 30;

    let candles: RawCandle[] = [];
    let marketFetchError: string | null = null;

    // 1. Fetch OHLC Candles with Graceful Fallback (ADR-28)
    try {
      const ohlcBars = await this.marketDataService.getOHLC(symbol, timeframe, candleCount);
      candles = ohlcBars.map((b) => ({
        time: b.time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume
      }));
    } catch (err: any) {
      marketFetchError = err.message || 'Market data provider temporarily unavailable';
      console.warn(`[ContextInjectionService] Fallback triggered for ${symbol} (${timeframe}):`, marketFetchError);
    }

    // 2. Fetch Relevant News with Graceful Fallback (ADR-28)
    let relevantNews: { headline: string; summary: string; time: string }[] = [];
    if (options.includeNews && this.newsService) {
      try {
        const newsLimit = options.newsLimit || 3;
        let articles = await this.newsService.getRecentNews(newsLimit, undefined, symbol.toLowerCase());
        if (articles.length === 0) {
          articles = await this.newsService.getRecentNews(newsLimit);
        }
        relevantNews = articles.map((a) => ({
          headline: a.headline,
          summary: a.summary,
          time: new Date(a.datetime * 1000).toISOString()
        }));
      } catch (err: any) {
        console.warn(`[ContextInjectionService] News fetch fallback for ${symbol}:`, err.message);
      }
    }

    // 3. Compute Technical Indicators (ADR-22)
    let contextMarkdown = `\n--- MARKET CONTEXT: ${symbol} (${timeframe.toUpperCase()}) ---\n`;

    if (candles.length > 0) {
      const latestBar = candles[candles.length - 1]!;
      const previousBar = candles.length > 1 ? candles[candles.length - 2]! : latestBar;
      const closes = candles.map((c) => c.close);

      contextMarkdown += `• **Current Bar**: Close: ${latestBar.close}, High: ${latestBar.high}, Low: ${latestBar.low}, Open: ${latestBar.open}\n`;
      contextMarkdown += `• **Previous Bar**: Close: ${previousBar.close}, High: ${previousBar.high}, Low: ${previousBar.low}\n`;

      const indConfig = options.indicators || {};

      // Moving Averages
      if (indConfig.sma) {
        for (const period of indConfig.sma) {
          const sma = IndicatorCalculator.calculateSMA(closes, period);
          if (sma !== undefined) {
            contextMarkdown += `• **SMA(${period})**: ${sma}\n`;
          }
        }
      } else {
        const sma20 = IndicatorCalculator.calculateSMA(closes, 20);
        if (sma20 !== undefined) contextMarkdown += `• **SMA(20)**: ${sma20}\n`;
      }

      if (indConfig.ema) {
        for (const period of indConfig.ema) {
          const ema = IndicatorCalculator.calculateEMA(closes, period);
          if (ema !== undefined) {
            contextMarkdown += `• **EMA(${period})**: ${ema}\n`;
          }
        }
      } else {
        const ema20 = IndicatorCalculator.calculateEMA(closes, 20);
        if (ema20 !== undefined) contextMarkdown += `• **EMA(20)**: ${ema20}\n`;
      }

      // RSI
      if (indConfig.rsi !== false) {
        const rsi14 = IndicatorCalculator.calculateRSI(closes, 14);
        if (rsi14 !== undefined) {
          contextMarkdown += `• **RSI(14)**: ${rsi14} (${rsi14 >= 70 ? 'Overbought' : rsi14 <= 30 ? 'Oversold' : 'Neutral'})\n`;
        }
      }

      // ATR
      if (indConfig.atr !== false) {
        const atr14 = IndicatorCalculator.calculateATR(candles, 14);
        if (atr14 !== undefined) {
          contextMarkdown += `• **ATR(14)**: ${atr14}\n`;
        }
      }

      // Support & Resistance Swing Fractals
      if (indConfig.supportResistance !== false) {
        const sr = IndicatorCalculator.calculateSupportResistance(candles, Math.min(30, candles.length));
        contextMarkdown += `• **Recent High/Low**: High ${sr.recentHigh} | Low ${sr.recentLow}\n`;
        if (sr.supports.length > 0) {
          contextMarkdown += `• **Key Support Levels**: ${sr.supports.join(', ')}\n`;
        }
        if (sr.resistances.length > 0) {
          contextMarkdown += `• **Key Resistance Levels**: ${sr.resistances.join(', ')}\n`;
        }
      }
    } else {
      contextMarkdown += `• *Notice: Live/Historical candle data for ${symbol} is currently unavailable (${marketFetchError || 'No feed'}). Base your analysis on general asset characteristics and macroeconomic factors.*\n`;
    }

    // Append News
    if (relevantNews.length > 0) {
      contextMarkdown += `\n• **Latest Market Catalysts & News**:\n`;
      for (const item of relevantNews) {
        contextMarkdown += `  - [${item.headline}]: ${item.summary}\n`;
      }
    }

    contextMarkdown += `--- END MARKET CONTEXT ---\n`;

    return {
      contextBlock: contextMarkdown,
      metadata: {
        symbol,
        timeframe,
        candlesLoaded: candles.length,
        lastPrice: candles.length > 0 ? candles[candles.length - 1]?.close : undefined,
        indicatorsComputed: candles.length > 0,
        newsIncluded: relevantNews.length
      }
    };
  }
}
