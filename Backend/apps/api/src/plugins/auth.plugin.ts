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

  // 2. Decorate fastify.authenticate (Hybrid JWT + Active Session Verification)
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err: any) {
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
  });

  // 3. Decorate fastify.requireAdmin (Role-Based Access Control)
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.authenticate(request, reply);

    // Authoritative role check from DB — JWT claim can be up to 7 days stale
    const user = await fastify.container.repositories.userRepo.findById(request.user.userId);
    if (!user?.isAdmin) {
      throw new ForbiddenError('Administrative privileges required for this action.');
    }
  });
};

export const authPlugin = fp(authPluginCallback, {
  name: 'auth-plugin',
  dependencies: ['app-container']
});
