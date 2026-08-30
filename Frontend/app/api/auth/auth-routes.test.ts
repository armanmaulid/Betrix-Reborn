import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as loginHandler } from './login/route';
import { POST as logoutHandler } from './logout/route';
import { GET as sessionHandler } from './session/route';
import { GET as adminProxyHandler } from '../admin/[...path]/route';
import { NextRequest } from 'next/server';

// Mock cookies store
const mockCookieMap = new Map<string, any>();
const mockCookieStore = {
  set: vi.fn((key: string, value: string, options?: any) => {
    mockCookieMap.set(key, { value, options });
  }),
  get: vi.fn((key: string) => {
    return mockCookieMap.get(key);
  }),
  delete: vi.fn((key: string) => {
    mockCookieMap.delete(key);
  })
};

vi.mock('next/headers', () => ({
  cookies: async () => mockCookieStore
}));

const ADMIN_USER = {
  id: 'admin-uuid-1',
  email: 'admin@betrix.io',
  name: 'Chief Admin',
  isAdmin: true,
  status: 'active'
};

describe('Next.js Auth Route Handlers Integration Tests', () => {
  beforeEach(() => {
    mockCookieMap.clear();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('Test Gate 1.3: Successful admin login stores httpOnly cookie and returns user data', async () => {
    const mockBackendResponse = {
      success: true,
      data: {
        token: 'signed-admin-jwt-token',
        sessionToken: 'sess-token-123',
        user: ADMIN_USER
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockBackendResponse
    });

    const req = new NextRequest('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@betrix.io',
        password: 'password123',
        deviceFingerprint: 'device-fp-123'
      })
    });

    const res = await loginHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('admin@betrix.io');

    // Verify httpOnly cookie was set
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'betrix_admin_token',
      'signed-admin-jwt-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/'
      })
    );
  });

  it('Test Gate 1.4: Non-admin rejection (isAdmin: false) returns 403 Forbidden', async () => {
    const mockBackendResponse = {
      success: true,
      data: {
        token: 'signed-user-jwt-token',
        sessionToken: 'sess-token-456',
        user: {
          id: 'trader-uuid-2',
          email: 'trader@betrix.io',
          name: 'Regular Trader',
          isAdmin: false,
          status: 'active'
        }
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockBackendResponse
    });

    const req = new NextRequest('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'trader@betrix.io',
        password: 'password123',
        deviceFingerprint: 'device-fp-123'
      })
    });

    const res = await loginHandler(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Access Denied');
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });

  it('Test Gate 1.4a: Malformed JSON request body returns 400 Invalid request body', async () => {
    const req = new NextRequest('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: '{not-valid-json',
      headers: { 'Content-Type': 'application/json' }
    });

    const res = await loginHandler(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Invalid request body');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Test Gate 1.4b: Upstream 4xx error is whitelisted to safe fields only', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        message: 'Upstream says no',
        error: {
          message: 'CAPTCHA verification required due to recent failed login attempts.',
          delayMs: 4000,
          details: {
            captcha: {
              id: 'cap-challenge-9',
              question: 'What is 12 + 7?',
              expiresInSeconds: 300
            }
          },
          stack: 'sensitive-stack-trace',
          internalHost: 'db-node-01:5432'
        }
      })
    });

    const req = new NextRequest('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@betrix.io',
        password: 'wrong-password',
        deviceFingerprint: 'device-fp-123'
      })
    });

    const res = await loginHandler(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('CAPTCHA verification required due to recent failed login attempts.');
    expect(body.error.captchaId).toBe('cap-challenge-9');
    expect(body.error.question).toBe('What is 12 + 7?');
    expect(body.error.delayMs).toBe(4000);
    // Internal fields must be stripped, never spread through
    expect(body.error.stack).toBeUndefined();
    expect(body.error.internalHost).toBeUndefined();
    expect(Object.keys(body.error).sort()).toEqual(['captchaId', 'delayMs', 'message', 'question']);
  });

  it('Admin proxy: upstream 204 responds success with preserved 204 status and never parses a body', async () => {
    mockCookieMap.set('betrix_admin_token', { value: 'valid-admin-token' });

    const adminFetch = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/me/profile')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: ADMIN_USER })
        };
      }
      return {
        ok: true,
        status: 204,
        headers: new Headers({
          'content-type': 'application/json',
          'content-length': '0'
        }),
        json: async () => {
          throw new Error('204 upstream body must not be parsed');
        }
      };
    });
    global.fetch = adminFetch as unknown as typeof fetch;

    const req = new NextRequest('http://localhost:3001/api/admin/users?page=1', {
      method: 'GET'
    });
    const res = await adminProxyHandler(req, {
      params: Promise.resolve({ path: ['users'] })
    });

    expect(res.status).toBe(204);
    // No body may exist on a 204 per the fetch spec
    await expect(res.text()).resolves.toBe('');

    // Both the session verification and the proxied call went through
    expect(adminFetch).toHaveBeenCalledTimes(2);
    const [firstUrl, firstInit] = adminFetch.mock.calls[0];
    expect(String(firstUrl)).toContain('/me/profile');
    const [secondUrl] = adminFetch.mock.calls[1];
    expect(String(secondUrl)).toContain('/admin/users?page=1');
    expect(((firstInit ?? {}) as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer valid-admin-token'
    });
  });

  it('Test Gate 1.5: Logout revokes session on backend and clears client cookie', async () => {
    mockCookieMap.set('betrix_admin_token', { value: 'existing-admin-token' });

    const mockBackendFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { message: 'Logged out' } })
    });
    global.fetch = mockBackendFetch;

    const req = new NextRequest('http://localhost:3001/api/auth/logout', { method: 'POST' });
    const res = await logoutHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockBackendFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer existing-admin-token'
        })
      })
    );

    // Verify cookie was deleted
    expect(mockCookieStore.delete).toHaveBeenCalledWith('betrix_admin_token');
  });

  it('Session handler verifies token against backend and returns admin user', async () => {
    mockCookieMap.set('betrix_admin_token', { value: 'valid-token' });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: ADMIN_USER })
    });

    const req = new NextRequest('http://localhost:3001/api/auth/session', { method: 'GET' });
    const res = await sessionHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.authenticated).toBe(true);
    expect(body.data.user.email).toBe('admin@betrix.io');
  });

  it('Session handler rejects expired/invalid token (backend 401)', async () => {
    mockCookieMap.set('betrix_admin_token', { value: 'expired-token' });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { message: 'Invalid token' } })
    });

    const req = new NextRequest('http://localhost:3001/api/auth/session', { method: 'GET' });
    const res = await sessionHandler(req);
    const body = await res.json();

    expect(body.success).toBe(false);
    expect(body.data.authenticated).toBe(false);
  });

  it('Session handler rejects non-admin user (backend returns isAdmin false)', async () => {
    mockCookieMap.set('betrix_admin_token', { value: 'trader-token' });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { ...ADMIN_USER, isAdmin: false }
      })
    });

    const req = new NextRequest('http://localhost:3001/api/auth/session', { method: 'GET' });
    const res = await sessionHandler(req);
    const body = await res.json();

    expect(body.success).toBe(false);
    expect(body.data.authenticated).toBe(false);
  });
});
