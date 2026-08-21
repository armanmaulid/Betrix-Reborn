import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as loginHandler } from './login/route';
import { POST as logoutHandler } from './logout/route';
import { GET as sessionHandler } from './session/route';
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
        user: {
          id: 'admin-uuid-1',
          email: 'admin@betrix.io',
          name: 'Chief Admin',
          isAdmin: true,
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

  it('Test Gate 1.5: Logout revokes session on backend and clears client cookies', async () => {
    mockCookieMap.set('betrix_admin_token', { value: 'existing-admin-token' });
    mockCookieMap.set('betrix_admin_user', { value: JSON.stringify({ id: 'admin-1' }) });

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

    // Verify cookies were deleted
    expect(mockCookieStore.delete).toHaveBeenCalledWith('betrix_admin_token');
    expect(mockCookieStore.delete).toHaveBeenCalledWith('betrix_admin_user');
  });

  it('Session handler returns authenticated status when valid cookie is present', async () => {
    mockCookieMap.set('betrix_admin_token', { value: 'valid-token' });
    mockCookieMap.set('betrix_admin_user', {
      value: JSON.stringify({
        id: 'admin-uuid',
        email: 'admin@betrix.io',
        name: 'Admin',
        isAdmin: true
      })
    });

    const req = new NextRequest('http://localhost:3001/api/auth/session', { method: 'GET' });
    const res = await sessionHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.authenticated).toBe(true);
    expect(body.data.user.email).toBe('admin@betrix.io');
  });
});
