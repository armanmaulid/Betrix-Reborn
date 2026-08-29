/**
 * W4 — Single parser for comma-separated env lists. Centralises the
 * `split → trim → filter(Boolean) → transform → validate` pipeline that the
 * 3 backfill scripts (cot, fx, commodities) used to re-implement.
 *
 * `transform` runs on each non-empty entry; `validate` filters out invalid
 * values. Returns the fallback (default `[]`) when the raw env value is
 * missing or empty.
 */
export function parseList<T extends string = string>(
  raw: string | undefined,
  opts: {
    transform?: (value: string) => T;
    validate?: (value: string) => boolean;
    fallback?: T[];
  }
): T[] {
  if (!raw) return opts.fallback ?? [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (opts.transform ? opts.transform(s) : (s as T)))
    .filter((s) => (opts.validate ? opts.validate(s) : true));
}
