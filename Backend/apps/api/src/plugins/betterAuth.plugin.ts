import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { fromNodeHeaders } from 'better-auth/node';
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
    fastify.log.info(
      '[better-auth] USE_BETTER_AUTH=false — legacy auth path active, BA handler not mounted.'
    );
    return;
  }

  const db = fastify.container.db;
  const { repositories: repos, services } = fastify.container;
  const authInstance = createAuth(db, {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    hooks: {
      deviceRepo: repos.deviceRepo,
      loginAttemptRepo: repos.loginAttemptRepo,
      activityLogRepo: repos.activityLogRepo,
      captchaService: services.captchaService
    }
  });
  fastify.decorate('betterAuth', authInstance);

  // B-6 — use BA's canonical Fastify pattern (auth.handler + Fetch Request)
  // instead of `toNodeHandler`. The Node adapter writes directly to the
  // raw response (`res.end()` inside its setResponse stream loop), which
  // races with Fastify's own reply lifecycle and produces intermittent
  // double-end errors. The Web handler returns a standard Response that
  // Fastify forwards once — single source of truth for response finalization.
  fastify.all('/api/auth/*', async (request: FastifyRequest, reply: FastifyReply) => {
    // Honor x-forwarded-proto (when behind a trusted proxy) so BA generates
    // correct redirect URLs. Falls back to request.protocol for direct conns.
    const proto = (request.headers['x-forwarded-proto'] as string | undefined) ?? request.protocol;
    const url = new URL(request.url, `${proto}://${request.headers.host}`);
    const req = new Request(url.toString(), {
      method: request.method,
      headers: fromNodeHeaders(request.headers),
      ...(request.body && Object.keys(request.body as object).length > 0
        ? { body: JSON.stringify(request.body) }
        : {})
    });
    const response = await authInstance.handler(req);
    reply.status(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    const body = response.body ? await response.text() : null;
    return reply.send(body);
  });

  fastify.log.info('[better-auth] USE_BETTER_AUTH=true — BA handler mounted at /api/auth/*');
};

export const betterAuthPlugin = fp(betterAuthPluginCallback, {
  name: 'better-auth-plugin',
  dependencies: ['app-container']
});
