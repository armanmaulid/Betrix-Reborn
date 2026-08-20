import { getHistoricalRates } from 'dukascopy-node';
import { IHistoricalProvider, OHLCBar } from '@betrix/domain';
import { NotFoundError, ValidationError } from '@betrix/core';

export class DukascopyHistoryClient implements IHistoricalProvider {
  private static readonly TIMEFRAME_MAP: Record<string, string> = {
    m1: 'm1',
    m5: 'm5',
    m15: 'm15',
    m30: 'm30',
    h1: 'h1',
    h4: 'h4',
    d1: 'd1',
    mn1: 'mn'
  };

  private symbolMap: Record<string, string> = {
    EURUSD: 'eurusd',
    GBPUSD: 'gbpusd',
    USDJPY: 'usdjpy',
    USDCAD: 'usdcad',
    AUDUSD: 'audusd',
    NZDUSD: 'nzdusd',
    USDCHF: 'usdchf',
    GBPJPY: 'gbpjpy',
    EURJPY: 'eurjpy',
    EURGBP: 'eurgbp',
    XAUUSD: 'xauusd',
    XAGUSD: 'xagusd',
    XTIUSD: 'lightcmdusd',
    XBRUSD: 'brentcmdusd',
    BTCUSD: 'btcusd',
    ETHUSD: 'ethusd',
    US500: 'usa500idxusd',
    US30: 'usa30idxusd',
    NAS100: 'usatechidxusd'
  };

  constructor(customMap?: Record<string, string>) {
    if (customMap) {
      this.symbolMap = { ...this.symbolMap, ...customMap };
    }
  }

  public updateSymbolMap(map: Record<string, string>): void {
    this.symbolMap = { ...this.symbolMap, ...map };
  }

  async fetchHistory(
    symbol: string,
    timeframe: string,
    fromDate: Date,
    toDate: Date
  ): Promise<OHLCBar[]> {
    const symUpper = symbol.toUpperCase();
    const dukaInstrument = this.symbolMap[symUpper] || symUpper.toLowerCase();
    const tfLower = timeframe.toLowerCase();
    const dukaTimeframe = DukascopyHistoryClient.TIMEFRAME_MAP[tfLower];

    if (!dukaTimeframe) {
      throw new ValidationError(`Unsupported timeframe for Dukascopy: ${timeframe}`);
    }

    // Weekend snapping: If Saturday or Sunday, snap to Friday 23:59:00 UTC
    let adjustedToDate = new Date(toDate);
    const dayOfWeek = adjustedToDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 6) {
      adjustedToDate.setUTCDate(adjustedToDate.getUTCDate() - 1);
      adjustedToDate.setUTCHours(23, 59, 0, 0);
    } else if (dayOfWeek === 0) {
      adjustedToDate.setUTCDate(adjustedToDate.getUTCDate() - 2);
      adjustedToDate.setUTCHours(23, 59, 0, 0);
    }

    try {
      const rawRates = await getHistoricalRates({
        instrument: dukaInstrument as any,
        dates: {
          from: fromDate,
          to: adjustedToDate
        },
        timeframe: dukaTimeframe as any,
        format: 'json',
        utcOffset: 0,
        volumes: true,
        useCache: false
      });

      if (Array.isArray(rawRates) && rawRates.length > 0) {
        return rawRates.map((c: any) => {
          const timestampMs = typeof c.timestamp === 'number' ? c.timestamp : new Date(c.timestamp).getTime();
          return new OHLCBar({
            time: Math.floor(timestampMs / 1000), // Unix seconds
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
            volume: Number(c.volume || 0)
          });
        });
      }
    } catch (err: any) {
      // Dukascopy API unreachable — fail fast with clear error (no synthetic fallback)
      console.error(`[DukascopyHistoryClient] Fetch failed for ${symUpper} ${dukaTimeframe}: ${err.message}`);
      throw new NotFoundError(
        `OHLC data unavailable for ${symUpper} (${dukaTimeframe}). Dukascopy API unreachable: ${err.message}`
      );
    }

    // No data returned — fail fast
    throw new NotFoundError(
      `No OHLC data available for ${symUpper} (${dukaTimeframe}) in the requested date range.`
    );
  }
}
