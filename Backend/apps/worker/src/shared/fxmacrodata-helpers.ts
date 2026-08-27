import { env } from '@betrix/config';

/**
 * Resolves the active calendar currency list. Tier 2 multi-currency: when
 * `FXMACRODATA_CALENDAR_CURRENCIES` is set (comma-separated), it takes
 * precedence. Otherwise fall back to single `FXMACRODATA_CALENDAR_CURRENCY`
 * for backward compatibility. Always lowercased; callers uppercase at use
 * site for logging. Single source of truth shared by seeder, worker, and
 * the backfill CLI.
 */
export function activeCalendarCurrencies(): string[] {
  return env.FXMACRODATA_CALENDAR_CURRENCIES ?? [env.FXMACRODATA_CALENDAR_CURRENCY];
}
