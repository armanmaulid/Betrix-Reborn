import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { fromNodeHeaders } from 'better-auth/node';
import { env } from '@betrix/config';
import { UnauthorizedError, ForbiddenError } from '@betrix/core';

export interface JwtPayload {
  userId: string;
  sessionId: string;
  email: string;
  isAdmin: boolean;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    // P18 — typed accessor for the live user record `authenticate()` looked
    // up. Replaces the `(request as ...).authUser` casts that used to
    // deoptimize V8's hidden classes.
    authUser: { id: string; isAdmin: boolean; status: string } | null;
  }
}

const authPluginCallback: FastifyPluginAsync = async (fastify) => {
  // P18 — register the request decorator with a typed default so the lookup
  // is allocation-free and V8 keeps a single hidden class for the request.
  fastify.decorateRequest('authUser', null);

  // 1. Register Fastify JWT
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN
    }
  });

  // 2. Decorate fastify.authenticate (Hybrid JWT + Active Session Verification).
  // D1 Phase 2 Slice 1 — when USE_BETTER_AUTH=true the session is resolved
  // through Better Auth's getSession (cookie/session-token based) instead of
  // the legacy JWT. The legacy JWT path remains the default (flag off) so the
  // 8 identity use-cases keep working unchanged during the parallel-run window.
  fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    if (env.USE_BETTER_AUTH) {
      const session = await fastify.betterAuth.api.getSession({
        headers: fromNodeHeaders(request.headers)
      });
      if (!session?.user) {
        throw new UnauthorizedError('Invalid or expired authentication session.');
      }
      const user = await fastify.container.repositories.userRepo.findById(session.user.id);
      if (!user || user.status !== 'active') {
        throw new UnauthorizedError('Account is not active. Please contact support.');
      }
      request.authUser = { id: user.id, isAdmin: user.isAdmin, status: user.status };
      return;
    }

    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token.');
    }

    const { userId, sessionId } = request.user;
    if (!userId || !sessionId) {
      throw new UnauthorizedError('Malformed token payload.');
    }

    // Verify session is active in database (instant revocation support)
    const session = await fastify.container.repositories.sessionRepo.findByToken(sessionId);
    if (!session || session.userId !== userId) {
      throw new UnauthorizedError('Session has expired or been revoked. Please log in again.');
    }

    // Re-check live user state — bans/suspensions apply immediately, not at token expiry
    const user = await fastify.container.repositories.userRepo.findById(userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('Account is not active. Please contact support.');
    }
    request.authUser = user ? { id: user.id, isAdmin: user.isAdmin, status: user.status } : null;
  });

  // 3. Decorate fastify.requireAdmin (Role-Based Access Control)
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.authenticate(request, reply);

    // Authoritative role check from DB — JWT claim can be up to 7 days stale.
    // Reuse the user authenticate() already loaded when possible.
    let user = request.authUser;
    if (!user) {
      const found = await fastify.container.repositories.userRepo.findById(request.user.userId);
      user = found ? { id: found.id, isAdmin: found.isAdmin, status: found.status } : null;
    }
    if (!user?.isAdmin) {
      throw new ForbiddenError('Administrative privileges required for this action.');
    }
  });
};

export const authPlugin = fp(authPluginCallback, {
  name: 'auth-plugin',
  dependencies: ['app-container']
});
