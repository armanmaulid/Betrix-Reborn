import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
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
}

const authPluginCallback: FastifyPluginAsync = async (fastify) => {
  // 1. Register Fastify JWT
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN
    }
  });

  // 2. Decorate fastify.authenticate (Hybrid JWT + Active Session Verification).
  // The verified user is stashed on `request.authUser` so requireAdmin does
  // not need to re-query the DB (3 hits → 2 per admin request).
  fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
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
    (request as FastifyRequest & { authUser?: unknown }).authUser = user;
  });

  // 3. Decorate fastify.requireAdmin (Role-Based Access Control)
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.authenticate(request, reply);

    // Authoritative role check from DB — JWT claim can be up to 7 days stale.
    // Reuse the user authenticate() already loaded when possible.
    let user = (request as FastifyRequest & { authUser?: { isAdmin?: boolean } }).authUser as
      { isAdmin?: boolean } | undefined;
    if (!user) {
      user = (await fastify.container.repositories.userRepo.findById(
        request.user.userId
      )) as unknown as { isAdmin?: boolean } | undefined;
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
