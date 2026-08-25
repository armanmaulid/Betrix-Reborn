'use client';

import React, { useState, useMemo } from 'react';
import { CalendarDays, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

function formatEventDatetime(event: CalendarEvent): string {
  const d = new Date(event.announcementDatetimeUtc);
  return (
    d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      hour12: false
    }) + ' UTC'
  );
}

function formatValue(value: number | null): string {
  if (value === null) return '—';
  return formatFinancialNumber(value);
}

function SurpriseIndicator({ event }: { event: CalendarEvent }) {
  const surprise = event.surprise();
  if (surprise === null) return <Minus className="w-3 h-3 text-muted-foreground" />;
  if (surprise > 0) return <TrendingUp className="w-3 h-3 text-positive" />;
  if (surprise < 0) return <TrendingDown className="w-3 h-3 text-negative" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

export function CalendarContainer() {
  usePageTitle('ECONOMIC CALENDAR');
  const [currency, setCurrency] = useState('USD');
  const [mode, setMode] = useState<'upcoming' | 'month'>('upcoming');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const { data, isLoading, isError, isRefetching, refetch } = useCalendarQuery({
    currency,
    month: mode === 'month' ? month : undefined,
    // Upcoming mode keeps a small tail of already-released events visible so
    // Before/Forecast/Actual can be compared right after a release.
    pastDays: mode === 'upcoming' ? 2 : undefined,
    limit: 100
  });

  const events = useMemo(() => data || [], [data]);

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
            Before / Forecast / Actual releases sourced from FXMacroData official statistics
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

      {/* Filter Bar */}
      <div className="border border-border bg-black p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center border border-border bg-surface">
          <button
            type="button"
            onClick={() => setMode('upcoming')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              mode === 'upcoming'
                ? 'bg-accent/20 text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            UPCOMING
          </button>
          <button
            type="button"
            onClick={() => setMode('month')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border-l border-border ${
              mode === 'month'
                ? 'bg-accent/20 text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            BY MONTH
          </button>
        </div>

        {mode === 'month' && (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-surface border border-border px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
          />
        )}

        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="bg-surface border border-border px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent uppercase font-bold tracking-wider"
        >
          <option value="USD">USD</option>
        </select>

        <div className="ml-auto text-xs text-muted-foreground">
          TOTAL:{' '}
          <strong className="text-foreground tabular-nums">
            {formatFinancialNumber(events.length)}
          </strong>{' '}
          EVENTS
        </div>
      </div>

      {/* Table */}
      <div className="border border-border bg-surface overflow-x-auto">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
            LOADING ECONOMIC CALENDAR...
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-negative">
            ERROR QUERYING ECONOMIC CALENDAR.
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground border-dashed">
            NO CALENDAR EVENTS FOUND FOR THE CURRENT FILTERS.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase text-muted-foreground">
                <th className="text-left px-3 py-2 font-bold">Time</th>
                <th className="text-left px-3 py-2 font-bold">Impact</th>
                <th className="text-left px-3 py-2 font-bold">Event</th>
                <th className="text-right px-3 py-2 font-bold">Before</th>
                <th className="text-right px-3 py-2 font-bold">Forecast</th>
                <th className="text-right px-3 py-2 font-bold">Actual</th>
                <th className="text-center px-3 py-2 font-bold">Surprise</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-border/40 hover:bg-surface-hover transition-colors"
                >
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatEventDatetime(event)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 border text-[9px] font-bold uppercase ${IMPORTANCE_STYLES[event.importance]}`}
                    >
                      {event.importance}
                    </span>
                  </td>
                  <td className="px-3 py-2">
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
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {formatValue(event.beforeValue)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {formatValue(event.forecastValue)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-foreground">
                    {formatValue(event.actualValue)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center">
                      <SurpriseIndicator event={event} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
