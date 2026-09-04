import { describe, it, expect } from 'vitest';
import { ADMIN_ROUTES, ROUTE_SHORTCUT_MAP } from './routes';

describe('Route Registry (ADMIN_ROUTES)', () => {
  it('should contain exactly 13 distinct admin routes', () => {
    expect(ADMIN_ROUTES).toHaveLength(13);
    const uniqueHrefs = new Set(ADMIN_ROUTES.map((r) => r.href));
    expect(uniqueHrefs.size).toBe(13);
  });

  it('should have properly formatted route numbers 01 to 13', () => {
    const expectedNums = [
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
      '13'
    ];
    const actualNums = ADMIN_ROUTES.map((r) => r.num);
    expect(actualNums).toEqual(expectedNums);
  });

  it('should map shortcut keys a-m to exact target route hrefs', () => {
    expect(ROUTE_SHORTCUT_MAP['a']).toBe('/dashboard');
    expect(ROUTE_SHORTCUT_MAP['b']).toBe('/users');
    expect(ROUTE_SHORTCUT_MAP['c']).toBe('/vouchers');
    expect(ROUTE_SHORTCUT_MAP['d']).toBe('/agents');
    expect(ROUTE_SHORTCUT_MAP['e']).toBe('/chat-test');
    expect(ROUTE_SHORTCUT_MAP['f']).toBe('/news');
    expect(ROUTE_SHORTCUT_MAP['g']).toBe('/market-data');
    expect(ROUTE_SHORTCUT_MAP['h']).toBe('/stream-symbols');
    expect(ROUTE_SHORTCUT_MAP['i']).toBe('/ohlc-symbols');
    expect(ROUTE_SHORTCUT_MAP['j']).toBe('/calendar');
    expect(ROUTE_SHORTCUT_MAP['k']).toBe('/broadcast');
    expect(ROUTE_SHORTCUT_MAP['l']).toBe('/audit-logs');
    expect(ROUTE_SHORTCUT_MAP['m']).toBe('/maintenance');
  });

  it('should assign a shortcut key to every route', () => {
    for (const route of ADMIN_ROUTES) {
      expect(route.shortcutKey, route.name).toBeDefined();
    }
    expect(Object.keys(ROUTE_SHORTCUT_MAP)).toHaveLength(13);
  });

  it('should provide non-empty description and valid icon for every route', () => {
    for (const route of ADMIN_ROUTES) {
      expect(route.description).toBeTruthy();
      expect(route.icon).toBeDefined();
      expect(typeof route.href).toBe('string');
      expect(route.href.startsWith('/')).toBe(true);
    }
  });
});
