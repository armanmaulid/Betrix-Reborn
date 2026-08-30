import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { env } from '@betrix/config';
import { createAuth, type BetterAuthInstance } from '@betrix/infra';

export type { BetterAuthInstance };

declare module 'fastify' {
  interface FastifyInstance {
    betterAuth: BetterAuthInstance;
  }
}

/**
 * Phase 2 Slice 1 — Better Auth Fastify bridge (flag-gated).
 *
 * Mounts BA's catch-all handler at `/api/auth/*` ONLY when
 * `USE_BETTER_AUTH=true`. When the flag is off this plugin is a no-op: BA is
 * never constructed and the legacy `auth.plugin.ts` JWT path stays live, so
 * the 8 identity use-cases keep working unchanged.
 *
 * The constructed instance is decorated as `fastify.betterAuth` so the
 * `auth.plugin.ts` hook can resolve sessions through it when the flag is on.
 */
const betterAuthPluginCallback: FastifyPluginAsync = async (fastify) => {
  if (!env.USE_BETTER_AUTH) {
    fastify.log.info('[better-auth] USE_BETTER_AUTH=false — legacy auth path active, BA handler not mounted.');
    return;
  }

  const db = fastify.container.db;
  const authInstance = createAuth(db, {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL
  });
  fastify.decorate('betterAuth', authInstance);

  fastify.all('/api/auth/*', async (request: FastifyRequest, reply: FastifyReply) => {
    // fromNodeHeaders is sync (better-auth/node); no await needed.
    const nodeReq = request.raw;
    const nodeRes = reply.raw;
    await toNodeHandler(authInstance)(nodeReq, nodeRes);
  });

  fastify.log.info('[better-auth] USE_BETTER_AUTH=true — BA handler mounted at /api/auth/*');
};

export const betterAuthPlugin = fp(betterAuthPluginCallback, {
  name: 'better-auth-plugin',
  dependencies: ['app-container']
});
