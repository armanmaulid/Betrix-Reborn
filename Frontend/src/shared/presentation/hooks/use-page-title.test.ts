import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageTitle, formatPageTitle, BASE_TITLE } from './use-page-title';

describe('usePageTitle Hook & formatPageTitle', () => {
  beforeEach(() => {
    document.title = BASE_TITLE;
  });

  it('should format title correctly', () => {
    expect(formatPageTitle('Credit Vouchers')).toBe('BETRIX // CREDIT VOUCHERS');
    expect(formatPageTitle('BETRIX // ALREADY FORMATTED')).toBe('BETRIX // ALREADY FORMATTED');
    expect(formatPageTitle('')).toBe('BETRIX // ADMIN TERMINAL');
    expect(formatPageTitle(undefined)).toBe('BETRIX // ADMIN TERMINAL');
  });

  it('should set formatted title when subtitle is provided', () => {
    renderHook(() => usePageTitle('User Directory'));
    expect(document.title).toBe('BETRIX // USER DIRECTORY');
  });

  it('should preserve prefix if subtitle already has BETRIX //', () => {
    renderHook(() => usePageTitle('BETRIX // CUSTOM TITLE'));
    expect(document.title).toBe('BETRIX // CUSTOM TITLE');
  });

  it('should not allow an unmounting component to override a newly set title', () => {
    const page1 = renderHook(() => usePageTitle('Credit Vouchers'));
    expect(document.title).toBe('BETRIX // CREDIT VOUCHERS');

    // Page 2 mounts and sets its title
    renderHook(() => usePageTitle('Market Catalog'));
    expect(document.title).toBe('BETRIX // MARKET CATALOG');

    // Page 1 unmounts in background
    page1.unmount();
    // Document title must remain Page 2's title
    expect(document.title).toBe('BETRIX // MARKET CATALOG');
  });

  it('should use base title when subtitle is empty', () => {
    renderHook(() => usePageTitle(''));
    expect(document.title).toBe('BETRIX // ADMIN TERMINAL');
  });
});
