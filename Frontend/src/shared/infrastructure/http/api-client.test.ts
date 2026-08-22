import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, ApiError } from './api-client';

describe('Shared Infrastructure Http Client (apiFetch)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should successfully return JSON payload when response is ok', async () => {
    const mockData = { success: true, data: { id: 'test-1' } };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData
    });

    const result = await apiFetch('/api/test');
    expect(result).toEqual(mockData);
  });

  it('should throw ApiError with status and error message on failed response', async () => {
    const errorPayload = {
      success: false,
      error: { message: 'Unauthorized access', code: 'UNAUTHORIZED' }
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => errorPayload
    });

    await expect(apiFetch('/api/protected')).rejects.toThrow('Unauthorized access');
  });
});
