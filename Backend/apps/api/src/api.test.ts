import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { createServer } from './server.js';
import { User, CreditVoucher } from '@betrix/domain';

describe('Betrix-Reborn — Phase 5 Fastify API End-to-End Route Tests', () => {
  let app: FastifyInstance;
  let testUserToken: string;
  let testAdminToken: string;
  let testUserId: string;
  let testAdminId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    app = await createServer();
    await app.ready();

    testUserEmail = `api_test_trader_${Date.now()}@betrix.io`;
    const adminEmail = `api_admin_${Date.now()}@betrix.io`;

    // Register a standard user
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: testUserEmail,
        password: 'Password123!',
        name: 'API Tester',
        deviceFingerprint: `fp_test_dev_${Date.now()}`
      }
    });
    const regBody = regRes.json();
    testUserToken = regBody.data.token;
    testUserId = regBody.data.user.id;

    // Create and seed an admin user with valid UUID
    testAdminId = randomUUID();
    const adminUser = new User({
      id: testAdminId,
      email: adminEmail,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
      name: 'System Administrator',
      isAdmin: true,
      status: 'active',
      emailVerified: true,
      credits: 10000,
      createdAt: new Date()
    });
    await app.diContainer.cradle.repositories.userRepo.save(adminUser);

    const { session } = await app.diContainer.cradle.services.authService.createSession(
      adminUser.id,
      `fp_admin_dev_${Date.now()}`
    );

    testAdminToken = app.jwt.sign({
      userId: adminUser.id,
      sessionId: session.token,
      email: adminUser.email,
      isAdmin: true
    });
  });

  afterAll(async () => {
    if (testUserId) {
      await app.diContainer.cradle.repositories.userRepo.delete(testUserId).catch(() => {});
    }
    if (testAdminId) {
      await app.diContainer.cradle.repositories.userRepo.delete(testAdminId).catch(() => {});
    }
    await app.close();
  });

  // ==========================================
  // 1. HEALTH & SWAGGER DOCUMENTATION
  // ==========================================
  describe('Health & Documentation Endpoints', () => {
    it('GET /health returns 200 OK', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('status', 'ok');
    });

    it('GET /api/v1/health returns deep DB & Redis health check', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.services).toHaveProperty('postgres');
      expect(body.data.services).toHaveProperty('redis');
    });

    it('GET /docs returns Swagger UI HTML', async () => {
      const res = await app.inject({ method: 'GET', url: '/docs' });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
    });

    it('GET /docs/json returns OpenAPI 3.0 specification', async () => {
      const res = await app.inject({ method: 'GET', url: '/docs/json' });
      expect(res.statusCode).toBe(200);
      const spec = res.json();
      expect(spec.openapi).toMatch(/^3\./);
      expect(spec.info.title).toBe('Betrix-Reborn Market Intelligence API');
      expect(spec.paths).toHaveProperty('/api/v1/auth/login');
    });
  });

  // ==========================================
  // 2. AUTHENTICATION & SECURITY FLOWS
  // ==========================================
  describe('Authentication Routes (/api/v1/auth/*)', () => {
    it('GET /api/v1/auth/captcha generates a dynamic math challenge', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/auth/captcha' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.question).toMatch(/What is \d+ [+-] \d+\?/);
    });

    it('POST /api/v1/auth/login authenticates with valid credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUserEmail,
          password: 'Password123!',
          deviceFingerprint: `fp_login_test_${Date.now()}`
        }
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.user.email).toBe(testUserEmail);
    });

    it('POST /api/v1/auth/login rejects invalid password with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testUserEmail,
          password: 'WrongPassword!',
          deviceFingerprint: `fp_bad_pass_${Date.now()}`
        }
      });
      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('POST /api/v1/auth/stream-ticket issues single-use SSE ticket (ADR-18)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/stream-ticket',
        headers: { Authorization: `Bearer ${testUserToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.ticket).toBeDefined();
      expect(body.data.expiresInSeconds).toBe(60);
    });
  });

  // ==========================================
  // 3. USER PROFILE & MESSAGING (/api/v1/me/*)
  // ==========================================
  describe('User Profile & Messaging Routes (/api/v1/me/*)', () => {
    it('GET /api/v1/me/profile returns 401 when unauthenticated', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/me/profile' });
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/v1/me/profile returns current trader profile with valid JWT', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/me/profile',
        headers: { Authorization: `Bearer ${testUserToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(testUserEmail);
      expect(body.data.credits).toBe(100);
    });

    it('PUT /api/v1/me/profile updates profile data', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/me/profile',
        headers: { Authorization: `Bearer ${testUserToken}` },
        payload: {
          name: 'Updated Pro Trader',
          bio: 'Forex & Gold swing trader'
        }
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.name).toBe('Updated Pro Trader');
      expect(body.data.bio).toBe('Forex & Gold swing trader');
    });

    it('POST /api/v1/me/redeem-voucher successfully redeems voucher (ADR-29)', async () => {
      // Seed a test voucher
      const voucherCode = `API-TEST-${Date.now()}`;
      const voucher = new CreditVoucher({
        id: randomUUID(),
        code: voucherCode,
        amount: 300,
        isRedeemed: false,
        createdAt: new Date()
      });
      await app.diContainer.cradle.repositories.voucherRepo.create(voucher);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/me/redeem-voucher',
        headers: { Authorization: `Bearer ${testUserToken}` },
        payload: { code: voucherCode }
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.amount).toBe(300);
      expect(body.data.newBalance).toBe(400); // 100 initial + 300
    });

    it('POST /api/v1/me/messages sends support message', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/me/messages',
        headers: { Authorization: `Bearer ${testUserToken}` },
        payload: {
          toUserId: testAdminId,
          subject: 'Question regarding spreads',
          body: 'What is the average spread on EURUSD during London session?'
        }
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.subject).toBe('Question regarding spreads');
    });

    it('GET /api/v1/me/messages/inbox returns paginated inbox', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/me/messages/inbox',
        headers: { Authorization: `Bearer ${testUserToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
    });
  });

  // ==========================================
  // 4. MARKET & NEWS ROUTES
  // ==========================================
  describe('Market & News Routes (/api/v1/market/* & /api/v1/news)', () => {
    it('GET /api/v1/market/symbols returns list of tradable instruments', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/market/symbols' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/market/prices returns real-time price ticks', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/market/prices' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('GET /api/v1/chat/models returns available AI models and credit rates', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/chat/models' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.some((m: any) => m.modelName)).toBe(true);
    });

    it('GET /api/v1/news returns paginated market news feed', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/news' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
    });
  });

  // ==========================================
  // 5. ADMIN MANAGEMENT & RBAC SECURITY
  // ==========================================
  describe('Admin Routes & RBAC (/api/v1/admin/*)', () => {
    it('GET /api/v1/admin/users blocks non-admin user with 403 Forbidden', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: { Authorization: `Bearer ${testUserToken}` }
      });
      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/v1/admin/users allows admin user with 200 OK', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: { Authorization: `Bearer ${testAdminToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
    });

    it('POST /api/v1/admin/vouchers creates a voucher as admin', async () => {
      const code = `VIP-ADMIN-${Date.now()}`;
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/vouchers',
        headers: { Authorization: `Bearer ${testAdminToken}` },
        payload: {
          code,
          amount: 1000
        }
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.code).toBe(code);
      expect(body.data.amount).toBe(1000);
    });

    it('GET /api/v1/admin/metrics returns system metrics to admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/metrics',
        headers: { Authorization: `Bearer ${testAdminToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('totalUsers');
      expect(body.data).toHaveProperty('uptimeSeconds');
    });
  });

  // ==========================================
  // 6. VALIDATION & ERROR ENVELOPE (ADR-31)
  // ==========================================
  describe('Global Error Handling & Validation (ADR-31 / ADR-38)', () => {
    it('returns structured 400 VALIDATION_ERROR for malformed request body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'not-an-email',
          password: '123'
        }
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details).toBeDefined();
    });

    it('returns 404 for unknown endpoints', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/non-existent-endpoint' });
      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.success).toBe(false);
    });
  });
});
