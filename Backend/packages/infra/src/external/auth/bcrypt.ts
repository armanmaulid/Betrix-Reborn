// D1 Phase 2 — stable re-export of bcryptjs so the BA `password.hash` /
// `password.verify` callbacks in `packages/infra/src/auth/better-auth.ts`
// have a single import point. Future Slice work (e.g. swapping to argon2id)
// touches this file only.

export { default as bcrypt } from 'bcryptjs';
export type { hash as HashFn, compare as CompareFn } from 'bcryptjs';
