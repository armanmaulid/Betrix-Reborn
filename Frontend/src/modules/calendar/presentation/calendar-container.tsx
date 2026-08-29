'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { useCalendarQuery } from '@/modules/calendar/application/queries/use-calendar';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import { formatFinancialNumber } from '@/shared/utils';
import { Badge, type BadgeTone } from '@/shared/presentation/ui/badge';
import { PageHeader } from '@/shared/presentation/ui/page-header';
import { FilterBar } from '@/shared/presentation/ui/filter-bar';
import { TableShell, type TableColumn } from '@/shared/presentation/ui/table-shell';
import type {
  CalendarEvent,
  CalendarEventImportance
} from '@/modules/calendar/domain/entities/CalendarEvent';
import type { CalendarQueryParams } from '@/modules/calendar/domain/repositories/ICalendarRepository';

const IMPORTANCE_TONE: Record<CalendarEventImportance, BadgeTone> = {
  high: 'negative',
  medium: 'warning',
  low: 'neutral'
};

/**
 * Currency → Country presentation map. Data-driven on purpose: adding a
 * currency here instantly enables it in the filter select and the Country
 * column everywhere, with no other code change. Unknown codes fall back to a
 * globe glyph so a future backend currency never renders broken.
 */
const CURRENCY_META: Record<string, { flag: string; country: string }> = {
  USD: { flag: '🇺🇸', country: 'USA' },
  EUR: { flag: '🇪🇺', country: 'EURO AREA' },
  GBP: { flag: '🇬🇧', country: 'UK' },
  JPY: { flag: '🇯🇵', country: 'JAPAN' },
  CHF: { flag: '🇨🇭', country: 'SWITZERLAND' },
  AUD: { flag: '🇦🇺', country: 'AUSTRALIA' },
  NZD: { flag: '🇳🇿', country: 'NEW ZEALAND' },
  CAD: { flag: '🇨🇦', country: 'CANADA' },
  CNY: { flag: '🇨🇳', country: 'CHINA' }
};

function countryLabel(currency: string): string {
  const meta = CURRENCY_META[currency.toUpperCase()];
  return meta ? `${meta.flag} ${meta.country}` : `🌐 ${currency.toUpperCase()}`;
}

/** Actual-vs-forecast surprise is folded into the ACTUAL cell colour. */
function actualCellTone(event: CalendarEvent): string {
  const surprise = event.surprise();
  if (surprise === null || surprise === 0) return 'text-foreground';
  return surprise > 0 ? 'text-positive' : 'text-negative';
}

function surpriseTitle(event: CalendarEvent): string | undefined {
  const surprise = event.surprise();
  if (surprise === null) return undefined;
  return `Surprise vs forecast: ${surprise > 0 ? '+' : ''}${formatFinancialNumber(surprise)}`;
}

type PresetKey =
  | 'yesterday'
  | 'today'
  | 'tomorrow'
  | 'last_week'
  | 'this_week'
  | 'next_week'
  | 'last_month'
  | 'this_month'
  | 'next_month';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'yesterday', label: 'YESTERDAY' },
  { key: 'today', label: 'TODAY' },
  { key: 'tomorrow', label: 'TOMORROW' },
  { key: 'last_week', label: 'LAST WEEK' },
  { key: 'this_week', label: 'THIS WEEK' },
  { key: 'next_week', label: 'NEXT WEEK' },
  { key: 'last_month', label: 'LAST MONTH' },
  { key: 'this_month', label: 'THIS MONTH' },
  { key: 'next_month', label: 'NEXT MONTH' }
];

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// ── Local-time range helpers ────────────────────────────────────────────────
// Day/week/month boundaries are computed in the USER'S BROWSER timezone so
// "Today" means what the trader intuitively expects. Events are still rendered
// at their exact announcementUnix instant, just labelled in local time.

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Date arithmetic via setDate — survives DST transitions correctly. */
function addDays(d: Date, days: number): Date {
  const n = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  n.setDate(n.getDate() + days);
  return n;
}

/** Monday-based week start (ISO / forex convention). */
function mondayOfWeek(d: Date): Date {
  const offset = (d.getDay() + 6) % 7;
  return addDays(startOfDayLocal(d), -offset);
}

function unixRange(startLocal: Date, endExclusiveLocal: Date): { from: number; to: number } {
  return {
    from: Math.floor(startLocal.getTime() / 1000),
    to: Math.ceil(endExclusiveLocal.getTime() / 1000) - 1
  };
}

export function rangeForPreset(key: PresetKey, now = new Date()): { from: number; to: number } {
  const today = startOfDayLocal(now);
  switch (key) {
    case 'yesterday':
      return unixRange(addDays(today, -1), today);
    case 'today':
      return unixRange(today, addDays(today, 1));
    case 'tomorrow':
      return unixRange(addDays(today, 1), addDays(today, 2));
    case 'last_week':
      return unixRange(addDays(mondayOfWeek(today), -7), mondayOfWeek(today));
    case 'this_week':
      return unixRange(mondayOfWeek(today), addDays(mondayOfWeek(today), 7));
    case 'next_week':
      return unixRange(addDays(mondayOfWeek(today), 7), addDays(mondayOfWeek(today), 14));
    case 'last_month': {
      return unixRange(
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
        new Date(now.getFullYear(), now.getMonth(), 1)
      );
    }
    case 'this_month': {
      return unixRange(
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 1)
      );
    }
    case 'next_month': {
      return unixRange(
        new Date(now.getFullYear(), now.getMonth() + 1, 1),
        new Date(now.getFullYear(), now.getMonth() + 2, 1)
      );
    }
  }
}

// ── Table definition ────────────────────────────────────────────────────────

const CALENDAR_COLUMNS: TableColumn[] = [
  { key: 'time', label: 'Time' },
  { key: 'importance', label: 'Importance' },
  { key: 'country', label: 'Country' },
  { key: 'event', label: 'Event' },
  { key: 'actual', label: 'Actual', align: 'right' },
  { key: 'previous', label: 'Previous', align: 'right' },
  { key: 'forecast', label: 'Forecast', align: 'right' }
];

/** Every custom divider row spans exactly the table's column count. */
const DAY_HEADER_COLUMNS = CALENDAR_COLUMNS.length;

// ── Day grouping ────────────────────────────────────────────────────────────

interface DayGroup {
  /** Local "YYYY-MM-DD" — lexicographically sortable. */
  key: string;
  date: Date;
  relativeLabel: 'YESTERDAY' | 'TODAY' | 'TOMORROW' | null;
  events: CalendarEvent[];
}

function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatEventTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function formatValue(value: number | null): string {
  if (value === null) return '—';
  return formatFinancialNumber(value);
}

function EventTableRows({ events }: { events: CalendarEvent[] }) {
  return (
    <>
      {events.map((event) => (
        <tr key={event.id} className="transition-colors hover:bg-surface-hover/80">
          <td className="p-3 whitespace-nowrap tabular-nums text-muted-foreground">
            {formatEventTime(event.announcementUnix)}
          </td>
          <td className="p-3">
            <Badge tone={IMPORTANCE_TONE[event.importance]}>{event.importance}</Badge>
          </td>
          <td className="p-3 whitespace-nowrap" title={event.currency}>
            {countryLabel(event.currency)}
          </td>
          <td className="p-3">
            <div className="font-bold text-foreground">{event.eventName}</div>
            {event.forecastType && (
              <div className="text-[9px] text-muted-foreground uppercase mt-0.5">
                forecast: {event.forecastType.replace('_', ' ')}
              </div>
            )}
            {!event.hasOfficialForecast && (
              <div className="text-[9px] text-muted-foreground/70 uppercase mt-0.5">
                no official forecast
              </div>
            )}
          </td>
          <td
            className={`p-3 text-right font-bold tabular-nums ${actualCellTone(event)}`}
            title={surpriseTitle(event)}
          >
            {formatValue(event.actualValue)}
          </td>
          <td className="p-3 text-right tabular-nums text-muted-foreground">
            {formatValue(event.beforeValue)}
          </td>
          <td className="p-3 text-right tabular-nums text-muted-foreground">
            {formatValue(event.forecastValue)}
          </td>
        </tr>
      ))}
    </>
  );
}

export function CalendarContainer() {
  usePageTitle('ECONOMIC CALENDAR');
  const [currency, setCurrency] = useState('USD');
  // Default view: THIS WEEK, auto-scrolled to Today (see scroll effect below).
  const [preset, setPreset] = useState<PresetKey>('this_week');
  // 'preset' → quick-range buttons drive from/to. 'custom' → year/month inputs
  // (unlocks prior-year backfill + specific months; backend bypasses the 92-day
  // cap for `year`).
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  // Committed custom range — only re-queries after APPLY so we don't fire on
  // every keystroke. Defaults to the previous calendar year (the year the
  // backfill is supposed to cover).
  const initialYear = new Date().getFullYear() - 1;
  const [customYear, setCustomYear] = useState<number>(initialYear);
  const [customMonth, setCustomMonth] = useState<string>(''); // committed 'YYYY-MM' or ''
  // Raw input strings (controlled) for the custom form, plus a validation msg.
  const [customYearInput, setCustomYearInput] = useState<string>(String(initialYear));
  const [customMonthInput, setCustomMonthInput] = useState<string>('');
  const [customError, setCustomError] = useState<string | null>(null);

  const range = useMemo(() => rangeForPreset(preset), [preset]);

  const queryParams = useMemo<CalendarQueryParams>(() => {
    if (mode === 'custom') {
      const m = customMonth.trim();
      if (/^\d{4}-\d{2}$/.test(m)) return { currency, month: m, limit: 500 };
      if (Number.isInteger(customYear) && customYear >= 1990 && customYear <= 2100) {
        return { currency, year: customYear, limit: 500 };
      }
      // Invalid committed value — avoid silently falling back to "upcoming".
      return { currency, year: 1990, limit: 500 };
    }
    return { currency, from: range.from, to: range.to, limit: 250 };
  }, [mode, currency, customYear, customMonth, range]);

  const { data, isLoading, isError, isRefetching, refetch } = useCalendarQuery(queryParams);

  // Validate the custom form and commit on APPLY. The year is always required;
  // an optional month (1–12) narrows it to a single month, otherwise the whole
  // year is queried.
  const applyCustom = (): void => {
    const y = Number(customYearInput);
    if (!Number.isInteger(y) || y < 1990 || y > 2100) {
      setCustomError('Year must be an integer between 1990 and 2100.');
      return;
    }
    const mRaw = customMonthInput.trim();
    if (mRaw) {
      const m = Number(mRaw);
      if (!Number.isInteger(m) || m < 1 || m > 12) {
        setCustomError('Month must be a number between 1 and 12.');
        return;
      }
      setCustomYear(y);
      setCustomMonth(`${y}-${String(m).padStart(2, '0')}`);
      setCustomError(null);
      setMode('custom');
      return;
    }
    setCustomYear(y);
    setCustomMonth('');
    setCustomError(null);
    setMode('custom');
  };

  const groups = useMemo<DayGroup[]>(() => {
    const list = data || [];
    const todayK = dayKey(new Date());
    const yesterdayK = dayKey(addDays(new Date(), -1));
    const tomorrowK = dayKey(addDays(new Date(), 1));
    const byDay = new Map<string, DayGroup>();
    for (const ev of [...list].sort((a, b) => a.announcementUnix - b.announcementUnix)) {
      const d = new Date(ev.announcementUnix * 1000);
      const k = dayKey(d);
      let g = byDay.get(k);
      if (!g) {
        g = {
          key: k,
          date: d,
          relativeLabel:
            k === todayK
              ? 'TODAY'
              : k === yesterdayK
                ? 'YESTERDAY'
                : k === tomorrowK
                  ? 'TOMORROW'
                  : null,
          events: []
        };
        byDay.set(k, g);
      }
      g.events.push(ev);
    }
    return [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [data]);

  /**
   * Auto-scroll target: Today when it is inside the selected range, otherwise
   * the nearest day at/after today (e.g. Next Week → its Monday), else none.
   */
  const scrollTargetKey = useMemo(() => {
    if (groups.length === 0) return null;
    const today = groups.find((g) => g.relativeLabel === 'TODAY');
    if (today) return today.key;
    const nowK = dayKey(new Date());
    return groups.find((g) => g.key >= nowK)?.key ?? null;
  }, [groups]);

  // Scroll panel + per-day anchors. Registered via callback refs so the effect
  // below never touches refs during render (react-hooks safe).
  const listRef = useRef<HTMLDivElement | null>(null);
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastScrollSig = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || !data || !scrollTargetKey) return;
    // Re-scroll only when the user actually changes view — background polls
    // must never yank the viewport while someone is reading.
    const sig = `${mode}|${preset}|${currency}|${scrollTargetKey}`;
    if (lastScrollSig.current === sig) return;
    lastScrollSig.current = sig;

    const timer = window.setTimeout(() => {
      const el = groupRefs.current.get(scrollTargetKey);
      const panel = listRef.current;
      if (!el || !panel) return;
      panel.scrollTo({ top: el.offsetTop - 4, behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [data, isLoading, mode, preset, currency, scrollTargetKey]);

  const totalEvents = data?.length ?? 0;

  return (
    <div className="space-y-6 font-mono">
      <PageHeader
        title="ECONOMIC CALENDAR"
        icon={CalendarDays}
        subtitle={
          <>
            Before / Forecast / Actual releases sourced from FXMacroData official statistics · times
            shown in your local timezone
          </>
        }
        actions={
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
        }
      />

      {/* Filter Bar — quick-range presets */}
      <FilterBar className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setPreset(key);
                setMode('preset');
              }}
              className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                mode === 'preset' && preset === key
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-border bg-surface text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
              mode === 'custom'
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-border bg-surface text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
            title="Pick a specific year or month (unlocks prior-year backfill)"
          >
            CUSTOM
          </button>
        </div>

        {/* Custom range controls — visible whenever the user has entered custom
            mode. Month takes precedence over year (single month = YYYY-MM). */}
        {mode === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              YEAR
              <input
                type="number"
                min={1990}
                max={2100}
                value={customYearInput}
                onChange={(e) => setCustomYearInput(e.target.value)}
                className="w-20 bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent tabular-nums"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              MONTH
              <input
                type="number"
                min={1}
                max={12}
                placeholder="1–12"
                value={customMonthInput}
                onChange={(e) => setCustomMonthInput(e.target.value)}
                className="w-16 bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent tabular-nums"
              />
            </label>
            <button
              type="button"
              onClick={applyCustom}
              className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-accent bg-accent/20 text-accent hover:bg-accent/30 transition-colors cursor-pointer"
            >
              APPLY
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('preset');
                setCustomError(null);
              }}
              className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-border bg-surface text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Back to quick-range presets"
            >
              ← PRESETS
            </button>
            {customError && (
              <span className="text-[10px] font-bold uppercase text-negative">{customError}</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Currency"
            className="bg-surface border border-border px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent uppercase font-bold tracking-wider"
          >
            {Object.keys(CURRENCY_META).map((code) => (
              <option key={code} value={code}>
                {countryLabel(code)}
              </option>
            ))}
          </select>

          <div className="ml-auto text-xs text-muted-foreground">
            <span className="mr-3 hidden md:inline">
              {mode === 'custom'
                ? customMonth.trim()
                  ? `MONTH ${customMonth}`
                  : `YEAR ${customYear}`
                : `${new Date(range.from * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} → ${new Date(range.to * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`}
            </span>
            TOTAL:{' '}
            <strong className="text-foreground tabular-nums">
              {formatFinancialNumber(totalEvents)}
            </strong>{' '}
            EVENTS
          </div>
        </div>
      </FilterBar>

      {/* Table — grouped by local day, auto-scrolled to Today */}
      <TableShell
        columns={CALENDAR_COLUMNS}
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && !isError && groups.length === 0}
        loadingMessage="LOADING ECONOMIC CALENDAR..."
        errorMessage="ERROR QUERYING ECONOMIC CALENDAR."
        emptyMessage="NO CALENDAR EVENTS FOUND FOR THE SELECTED RANGE."
        stickyHeader
        wrapperRef={listRef}
        wrapperClassName="max-h-[72vh] overflow-y-auto relative"
      >
        {groups.map((group) => {
          const isToday = group.relativeLabel === 'TODAY';
          return (
            <React.Fragment key={group.key}>
              <tr
                ref={(el) => {
                  if (el) groupRefs.current.set(group.key, el);
                  else groupRefs.current.delete(group.key);
                }}
                className={isToday ? 'bg-accent/15' : 'bg-black/50'}
              >
                <td colSpan={DAY_HEADER_COLUMNS} className="px-3 py-1.5">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <span className={isToday ? 'text-accent' : 'text-foreground'}>
                      {WEEKDAYS[group.date.getDay()]}{' '}
                      {group.date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit'
                      })}
                    </span>
                    {group.relativeLabel && (
                      <Badge
                        tone={isToday ? 'accent' : 'neutral'}
                        className={isToday ? 'animate-pulse' : ''}
                      >
                        {group.relativeLabel}
                      </Badge>
                    )}
                    <span className="ml-auto text-muted-foreground normal-case tracking-normal">
                      {group.events.length} release{group.events.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </td>
              </tr>
              <EventTableRows events={group.events} />
            </React.Fragment>
          );
        })}
      </TableShell>
    </div>
  );
}
