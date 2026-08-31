// D1 Phase 0 — Better Auth module surface.
// Re-exports the BA Drizzle schema definitions and the lazy `auth` factory.
// Phase 2 will replace the factory body with the full Better Auth config
// (emailAndPassword + bcrypt override, socialProviders.google,
// emailVerification, admin plugin, rateLimit, custom hooks for device /
// captcha / credit / audit).

export * from './schemas.js';
export { createAuth, type BetterAuthInstance } from './better-auth.js';
