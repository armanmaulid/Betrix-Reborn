#!/usr/bin/env node
// T0.3 — Deep-compare two golden JSON captures with numeric tolerance.
//
// Usage:
//   node diff-json.mjs .golden/pre-fase1 .golden/post-fase1 [--tol 0]
//
// Exit code 0 = parity (within tolerance), 1 = differences found.
// Arrays are matched positionally; objects by key; numbers compared with
// abs(a-b) <= tol; null vs missing key counts as equal (schema drift friendly).

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [dirA, dirB] = process.argv.slice(2);
const tolIdx = process.argv.indexOf('--tol');
const TOL = tolIdx > -1 ? Number(process.argv[tolIdx + 1] ?? 0) : 0;

if (!dirA || !dirB) {
  console.error('usage: node diff-json.mjs <dirA> <dirB> [--tol 0]');
  process.exit(2);
}

function load(dir) {
  const out = {};
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.json'))
      out[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  }
  return out;
}

let diffs = 0;

function walk(a, b, path) {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) > TOL) report(path, a, b, 'numeric delta');
    return;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (a !== b) report(path, a, b, 'value mismatch');
    return;
  }
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    const av = a?.[k];
    const bv = b?.[k];
    if (av === undefined && bv === undefined) continue;
    if (av === undefined || bv === undefined) {
      // Missing on one side only counts when BOTH sides carry meaningful data.
      if (!(av === null || bv === null))
        report(`${path}.${k}`, av, bv, 'key present on one side only');
      continue;
    }
    walk(av, bv, `${path}.${k}`);
  }
}

function report(path, a, b, why) {
  diffs += 1;
  console.log(`DIFF ${path} :: ${why} :: A=${JSON.stringify(a)} B=${JSON.stringify(b)}`);
}

const A = load(dirA);
const B = load(dirB);

for (const name of new Set([...Object.keys(A), ...Object.keys(B)])) {
  if (!(name in A)) {
    console.log(`DIFF file ${name}: missing in A`);
    diffs += 1;
    continue;
  }
  if (!(name in B)) {
    console.log(`DIFF file ${name}: missing in B`);
    diffs += 1;
    continue;
  }
  walk(A[name], B[name], name);
}

if (diffs === 0) {
  console.log('✔ PARITY OK (within tolerance)');
  process.exit(0);
}
console.log(`✖ ${diffs} difference(s)`);
process.exit(1);
