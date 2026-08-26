#!/usr/bin/env node
// T2.1 enforcement — Hukum #4: every Redis key/channel literal must come from
// redis-keys.ts. This guard fails when a raw domain-prefixed key literal
// appears outside the whitelisted store modules.
//
// Run: pnpm --filter root guard:redis-keys  (or node scripts/guard-redis-keys.mjs)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname; // Backend/
const SRC_DIRS = [join(ROOT, 'apps'), join(ROOT, 'packages')];

const ALLOWED_FILES = [
  'packages/infra/src/persistence/redis/redis-keys.ts',
  'packages/infra/src/persistence/redis/RedisEphemeralStores.ts',
  'packages/infra/src/persistence/redis/RedisMarketDataRepository.ts',
  'packages/infra/src/messaging/RedisWorkerCommandBus.ts'
];

// Raw literals that indicate hand-rolled keys (domain prefixes).
const BAD_PATTERN = /(['"`])(auth|market|worker|rl|ops|cache|idem|news):(?!\/\/)/;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (/node_modules|dist|\.turbo|drizzle\/meta/.test(p)) continue;
      yield* walk(p);
    } else if (/\.tsx?$/.test(entry)) {
      yield p;
    }
  }
}

let violations = 0;
for (const dir of SRC_DIRS) {
  for (const file of walk(dir)) {
    const rel = relative(ROOT, file);
    if (ALLOWED_FILES.some((ok) => rel.endsWith(ok))) continue;
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (BAD_PATTERN.test(line)) {
        violations += 1;
        console.error(
          `[guard] raw redis key literal ${rel}:${i + 1} :: ${line.trim().slice(0, 100)}`
        );
      }
    });
  }
}

if (violations > 0) {
  console.error(`\n✖ ${violations} violation(s). Import redisKeys from '@betrix/infra' instead.`);
  process.exit(1);
}
console.log('✔ guard:redis-keys clean');
