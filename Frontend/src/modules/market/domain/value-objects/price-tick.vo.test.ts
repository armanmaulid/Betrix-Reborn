import { describe, it, expect } from 'vitest';
import { PriceTick } from './PriceTick';

describe('Market Domain: PriceTick Value Object', () => {
  it('should compute last price and spread correctly', () => {
    const tick = new PriceTick({
      symbol: 'EURUSD',
      bid: 1.085,
      ask: 1.08515,
      change24hPercent: 0.25
    });

    expect(tick.symbol).toBe('EURUSD');
    expect(tick.last).toBe(1.08508);
    expect(tick.spread).toBe(0.00015);
    expect(tick.isPositiveChange()).toBe(true);
    expect(tick.isNegativeChange()).toBe(false);
  });

  it('should format prices according to financial asset category and magnitude', () => {
    const cryptoTick = new PriceTick({ symbol: 'BTCUSDT', bid: 65432.1, ask: 65432.3 });
    const fxTick = new PriceTick({ symbol: 'EURUSD', bid: 1.08542, ask: 1.08545 });

    expect(cryptoTick.formatPrice('crypto')).toBe('65432.20');
    expect(fxTick.formatPrice('forex')).toBe('1.08543');
  });

  it('should calculate 24h change amount and percentage', () => {
    const { changeAmount, changePercent } = PriceTick.calculate24hChange(105, 100);
    expect(changeAmount).toBe(5);
    expect(changePercent).toBe(5);
  });
});
