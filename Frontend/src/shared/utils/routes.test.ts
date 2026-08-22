import { describe, it, expect } from 'vitest';
import { ADMIN_ROUTES, ROUTE_SHORTCUT_MAP } from './routes';

describe('Route Registry (ADMIN_ROUTES)', () => {
  it('should contain exactly 10 distinct admin routes', () => {
    expect(ADMIN_ROUTES).toHaveLength(10);
    const uniqueHrefs = new Set(ADMIN_ROUTES.map((r) => r.href));
    expect(uniqueHrefs.size).toBe(10);
  });

  it('should have properly formatted route numbers 01 to 10', () => {
    const expectedNums = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
    const actualNums = ADMIN_ROUTES.map((r) => r.num);
    expect(actualNums).toEqual(expectedNums);
  });

  it('should map shortcut keys 1-9 and 0 to exact target route hrefs', () => {
    expect(ROUTE_SHORTCUT_MAP['1']).toBe('/dashboard');
    expect(ROUTE_SHORTCUT_MAP['2']).toBe('/users');
    expect(ROUTE_SHORTCUT_MAP['3']).toBe('/vouchers');
    expect(ROUTE_SHORTCUT_MAP['4']).toBe('/agents');
    expect(ROUTE_SHORTCUT_MAP['5']).toBe('/news');
    expect(ROUTE_SHORTCUT_MAP['6']).toBe('/market-data');
    expect(ROUTE_SHORTCUT_MAP['7']).toBe('/stream-symbols');
    expect(ROUTE_SHORTCUT_MAP['8']).toBe('/broadcast');
    expect(ROUTE_SHORTCUT_MAP['9']).toBe('/audit-logs');
    expect(ROUTE_SHORTCUT_MAP['0']).toBe('/maintenance');
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
