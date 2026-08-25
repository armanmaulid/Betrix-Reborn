'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { useCalendarQuery } from '@calendar/application/queries/use-calendar';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import { formatFinancialNumber } from '@/shared/utils';
import type {
  CalendarEvent,
  CalendarEventImportance
} from '@calendar/domain/entities/CalendarEvent';

const IMPORTANCE_STYLES: Record<CalendarEventImportance, string> = {
  high: 'border-negative bg-negative/10 text-negative',
  medium: 'border-warning bg-warning/10 text-warning',
  low: 'border-border bg-surface text-muted-foreground'
};

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

function EventTableRows({ events }: { events: CalendarEvent[] }) {
  return (
    <>
      {events.map((event) => (
        <tr key={event.id} className="transition-colors hover:bg-surface-hover/80">
          <td className="p-3 whitespace-nowrap tabular-nums text-muted-foreground">
            {formatEventTime(event.announcementUnix)}
          </td>
          <td className="p-3">
            <span
              className={`inline-block px-1.5 py-0.5 border text-[9px] font-bold uppercase ${IMPORTANCE_STYLES[event.importance]}`}
            >
              {event.importance}
            </span>
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

const DAY_HEADER_COLUMNS = 7;

export function CalendarContainer() {
  usePageTitle('ECONOMIC CALENDAR');
  const [currency, setCurrency] = useState('USD');
  // Default view: THIS WEEK, auto-scrolled to Today (see scroll effect below).
  const [preset, setPreset] = useState<PresetKey>('this_week');

  const range = useMemo(() => rangeForPreset(preset), [preset]);

  const { data, isLoading, isError, isRefetching, refetch } = useCalendarQuery({
    currency,
    from: range.from,
    to: range.to,
    limit: 250
  });

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
    const sig = `${preset}|${currency}|${scrollTargetKey}`;
    if (lastScrollSig.current === sig) return;
    lastScrollSig.current = sig;

    const timer = window.setTimeout(() => {
      const el = groupRefs.current.get(scrollTargetKey);
      const panel = listRef.current;
      if (!el || !panel) return;
      panel.scrollTo({ top: el.offsetTop - 4, behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [data, isLoading, preset, currency, scrollTargetKey]);

  const totalEvents = data?.length ?? 0;

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header Bar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              ECONOMIC CALENDAR
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Before / Forecast / Actual releases sourced from FXMacroData official statistics · times
            shown in your local timezone
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Filter Bar — quick-range presets */}
      <div className="border border-border bg-black p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key)}
              className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                preset === key
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-border bg-surface text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

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
              {new Date(range.from * 1000).toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit'
              })}{' '}
              →{' '}
              {new Date(range.to * 1000).toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit'
              })}
            </span>
            TOTAL:{' '}
            <strong className="text-foreground tabular-nums">
              {formatFinancialNumber(totalEvents)}
            </strong>{' '}
            EVENTS
          </div>
        </div>
      </div>

      {/* Table — grouped by local day, auto-scrolled to Today */}
      <div
        ref={listRef}
        className="border border-border bg-surface overflow-x-auto max-h-[72vh] overflow-y-auto relative"
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-black/80 text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="p-3">TIME</th>
              <th className="p-3">IMPORTANCE</th>
              <th className="p-3">COUNTRY</th>
              <th className="p-3">EVENT</th>
              <th className="p-3 text-right">ACTUAL</th>
              <th className="p-3 text-right">PREVIOUS</th>
              <th className="p-3 text-right">FORECAST</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td
                  colSpan={DAY_HEADER_COLUMNS}
                  className="p-8 text-center text-muted-foreground animate-pulse"
                >
                  LOADING ECONOMIC CALENDAR...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={DAY_HEADER_COLUMNS} className="p-8 text-center text-negative">
                  ERROR QUERYING ECONOMIC CALENDAR.
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={DAY_HEADER_COLUMNS} className="p-8 text-center text-muted-foreground">
                  NO CALENDAR EVENTS FOUND FOR THE SELECTED RANGE.
                </td>
              </tr>
            ) : (
              groups.map((group) => {
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
                            <span
                              className={`px-1.5 py-0.5 border text-[9px] ${
                                isToday
                                  ? 'border-accent text-accent animate-pulse'
                                  : 'border-border text-muted-foreground'
                              }`}
                            >
                              {group.relativeLabel}
                            </span>
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
