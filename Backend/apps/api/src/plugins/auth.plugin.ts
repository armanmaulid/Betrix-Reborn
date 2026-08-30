import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { fromNodeHeaders } from 'better-auth/node';
import { UnauthorizedError, ForbiddenError } from '@betrix/core';

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

  // D1 Phase 4 — Better Auth is the only auth path (USE_BETTER_AUTH=true is
  // the default). Session resolved via BA getSession (cookie-based) from
  // request headers. Legacy JWT decorate + JwtPayload + the !flag branch
  // were removed.
  fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
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
  });

  // 3. Decorate fastify.requireAdmin (Role-Based Access Control)
  fastify.decorate('requireAdmin', async (request: FastifyRequest, _reply: FastifyReply) => {
    await fastify.authenticate(request, _reply);

    // Reuse the user record authenticate() already loaded.
    const user = request.authUser;
    if (!user?.isAdmin) {
      throw new ForbiddenError('Administrative privileges required for this action.');
    }
  });
};

export const authPlugin = fp(authPluginCallback, {
  name: 'auth-plugin',
  dependencies: ['app-container', 'better-auth-plugin']
});
