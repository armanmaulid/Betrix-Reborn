import pino from 'pino';
import { env } from '@betrix/config';
import { premiumEnvDiagnostic } from './marketdata/marketdata-backfill-lib.js';

/**
 * W3 — shared runner for the FXMacroData-Premium backfill scripts
 * (cot-backfill, fx-backfill, commodities-backfill). All three follow the
 * same shape: pino logger, premium env-diagnostic, year-span, instantiate
 * a `XxxBackfiller`, run, close. This helper captures the boilerplate so
 * each entry-point script is just: parse config → call `runBackfiller`.
 *
 * The third backfiller class (UsdCatalogueBackfiller) lives in
 * `marketdata-backfill-lib.ts` and is still invoked directly from a worker
 * (not a one-shot script) — it does not use this runner.
 */
export interface RunBackfillerOptions<T, R extends { close(): Promise<unknown> }> {
  /** Short label used in the env-diagnostic + completion log line. */
  label: string;
  /** Construct the backfiller (called once with the logger). */
  factory: (logger: pino.Logger) => R;
  /** Build the backfill call from the resolved year span + script input. */
  run: (backfiller: R, args: { startYear: number; endYear: number; input: T }) => Promise<unknown>;
  /** Script input (e.g. currencies / pairs / indicators). */
  input: T;
  /** Env-var name for the year-span override (default = 5). */
  yearsEnvVar?: string;
}

export async function runBackfiller<T, R extends { close(): Promise<unknown> }>(
  opts: RunBackfillerOptions<T, R>
): Promise<void> {
  const logger = pino({
    level: env.LOG_LEVEL || 'info',
    transport: { target: 'pino-pretty', options: { colorize: true } }
  });
  premiumEnvDiagnostic(logger, opts.label);

  const currentYear = new Date().getUTCFullYear();
  const years = Number(process.env[opts.yearsEnvVar ?? ''] ?? '5');
  const startYear = currentYear - years;
  const endYear = currentYear;

  const backfiller = opts.factory(logger);
  try {
    const result = (await opts.run(backfiller, { startYear, endYear, input: opts.input })) as {
      fetched?: number;
      saved?: number;
      failed?: number;
    };
    logger.info(
      `[${opts.label} COMPLETE] input=${JSON.stringify(opts.input)} years=${startYear}..${endYear} fetched=${result.fetched ?? '?'} saved=${result.saved ?? '?'} failed=${result.failed ?? '?'}`
    );
  } catch (err: any) {
    logger.error({ err: err.message }, `${opts.label} backfill failed`);
    process.exitCode = 1;
  } finally {
    await backfiller.close();
  }
}
