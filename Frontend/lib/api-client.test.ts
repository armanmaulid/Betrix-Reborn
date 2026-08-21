import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, ApiClientError } from './api-client';

describe('ApiClient Unit Tests', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('http://localhost:3000/api/v1');
    vi.restoreAllMocks();
  });

  it('should inject Authorization Bearer header when token is set', async () => {
    client.setToken('test-jwt-token-123');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, data: { status: 'healthy' } })
    });
    global.fetch = mockFetch;

    const result = await client.get<{ status: string }>('/health');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, config] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/v1/health');
    expect(config.headers['Authorization']).toBe('Bearer test-jwt-token-123');
    expect(result).toEqual({ status: 'healthy' });
  });

  it('should append search params properly to request URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, data: { users: [] } })
    });
    global.fetch = mockFetch;

    await client.get('/admin/users', {
      params: { page: 2, limit: 50, search: 'trader' }
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/v1/admin/users?page=2&limit=50&search=trader');
  });

  it('should throw ApiClientError with normalized status code and message on error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: { message: 'Access Denied: Admin role required.', code: 'FORBIDDEN' }
      })
    });
    global.fetch = mockFetch;

    await expect(client.get('/admin/metrics')).rejects.toThrow(ApiClientError);

    try {
      await client.get('/admin/metrics');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Access Denied: Admin role required.');
      expect(err.code).toBe('FORBIDDEN');
    }
  });

  it('should preserve CAPTCHA challenge details on 428 Precondition Required', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 428,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: {
          message: 'Anti-bruteforce CAPTCHA required',
          captchaId: 'cap-xyz-123',
          delayMs: 2000
        }
      })
    });
    global.fetch = mockFetch;

    try {
      await client.post('/auth/login', { email: 'bad@login.io', password: 'wrong' });
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect(err.statusCode).toBe(428);
      expect(err.captchaId).toBe('cap-xyz-123');
      expect(err.delayMs).toBe(2000);
    }
  });
});
