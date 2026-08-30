// D1 Phase 1 — Better Auth Drizzle schema re-export for the schema index.
//
// The actual table definitions live in `packages/infra/src/auth/schemas.ts`
// (kept separate from the legacy `identity.schema.ts` to keep the BA tables
// self-contained and reusable from the BA config in `auth/better-auth.ts`).
// This file exists so `drizzle-kit generate` picks up the new `auth`
// pgSchema namespace when emitting the Phase-1 migration.

export * from '../../../auth/schemas.js';
