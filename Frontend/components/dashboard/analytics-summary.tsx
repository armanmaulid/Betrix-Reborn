'use client';

import React, { useState } from 'react';
import { UserPlus, Flame, RefreshCw, Users, TrendingUp } from 'lucide-react';
import { formatFinancialNumber } from '@/lib/utils';
import type { UserAnalytics } from '@/lib/types';

interface AnalyticsSummaryProps {
  analytics?: UserAnalytics;
  isLoading?: boolean;
  onRefresh?: () => void;
  isRefetching?: boolean;
}

export function AnalyticsSummary({
  analytics,
  isLoading,
  onRefresh,
  isRefetching
}: AnalyticsSummaryProps) {
  const [regInterval, setRegInterval] = useState<'today' | 'week' | 'month'>('today');
  const [activeInterval, setActiveInterval] = useState<'24h' | 'weekly' | 'monthly'>('24h');

  const data: UserAnalytics = analytics || {
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    activeUsers24h: 0,
    activeUsersWeekly: 0,
    activeUsersMonthly: 0,
    topModels: [],
    dailyTokenUsage: []
  };

  const regValue =
    regInterval === 'today'
      ? data.newUsersToday
      : regInterval === 'week'
      ? data.newUsersThisWeek
      : data.newUsersThisMonth;

  const regLabel =
    regInterval === 'today'
      ? 'SINCE 00:00 UTC'
      : regInterval === 'week'
      ? 'ROLLING 7-DAY INTERVAL'
      : 'ROLLING 30-DAY INTERVAL';

  const activeValue =
    activeInterval === '24h'
      ? data.activeUsers24h
      : activeInterval === 'weekly'
      ? data.activeUsersWeekly
      : data.activeUsersMonthly;

  const activeLabel =
    activeInterval === '24h'
      ? 'LAST 24 HOURS ACTIVITY'
      : activeInterval === 'weekly'
      ? 'LAST 7 DAYS ACTIVE'
      : 'LAST 30 DAYS ACTIVE';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
        <span className="text-accent font-bold">[USER ACQUISITION & ACTIVITY SUMMARY]</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefetching}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border bg-surface px-2 py-0.5 transition-colors disabled:opacity-50"
            title="Refresh Analytics Dataset"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isRefetching ? 'animate-spin text-accent' : ''}`} />
            <span>SYNC</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
        {/* 1. New Registrations Card with Interval Tabs */}
        <div className="border border-border bg-surface p-4 flex flex-col justify-between space-y-3 hover:border-accent/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                <UserPlus className="w-3.5 h-3.5 text-positive" />
                <span>NEW REGISTRATIONS</span>
              </div>
              {/* Interval Switcher */}
              <div className="flex items-center gap-0.5 border border-border/80 bg-black p-0.5 text-[9px]">
                <button
                  type="button"
                  onClick={() => setRegInterval('today')}
                  className={`px-1.5 py-0.5 font-bold transition-colors ${
                    regInterval === 'today' ? 'bg-positive/20 text-positive' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  TODAY
                </button>
                <button
                  type="button"
                  onClick={() => setRegInterval('week')}
                  className={`px-1.5 py-0.5 font-bold transition-colors ${
                    regInterval === 'week' ? 'bg-positive/20 text-positive' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  WEEK
                </button>
                <button
                  type="button"
                  onClick={() => setRegInterval('month')}
                  className={`px-1.5 py-0.5 font-bold transition-colors ${
                    regInterval === 'month' ? 'bg-positive/20 text-positive' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  MONTH
                </button>
              </div>
            </div>

            <div className="text-2xl font-bold text-positive mt-2 tabular-nums">
              +{formatFinancialNumber(regValue)}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{regLabel}</div>
          </div>

          {/* Sub-breakdown chips */}
          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-border/50 text-[9px]">
            <div
              onClick={() => setRegInterval('today')}
              className={`p-1 border cursor-pointer transition-colors ${
                regInterval === 'today' ? 'border-positive/50 bg-positive/10 text-positive font-bold' : 'border-border/40 text-muted-foreground'
              }`}
            >
              <div className="text-[8px] uppercase">TODAY</div>
              <div className="tabular-nums font-bold">+{formatFinancialNumber(data.newUsersToday)}</div>
            </div>
            <div
              onClick={() => setRegInterval('week')}
              className={`p-1 border cursor-pointer transition-colors ${
                regInterval === 'week' ? 'border-positive/50 bg-positive/10 text-positive font-bold' : 'border-border/40 text-muted-foreground'
              }`}
            >
              <div className="text-[8px] uppercase">WEEK</div>
              <div className="tabular-nums font-bold">+{formatFinancialNumber(data.newUsersThisWeek)}</div>
            </div>
            <div
              onClick={() => setRegInterval('month')}
              className={`p-1 border cursor-pointer transition-colors ${
                regInterval === 'month' ? 'border-positive/50 bg-positive/10 text-positive font-bold' : 'border-border/40 text-muted-foreground'
              }`}
            >
              <div className="text-[8px] uppercase">MONTH</div>
              <div className="tabular-nums font-bold">+{formatFinancialNumber(data.newUsersThisMonth)}</div>
            </div>
          </div>
        </div>

        {/* 2. Active Traders Card with Interval Tabs */}
        <div className="border border-border bg-surface p-4 flex flex-col justify-between space-y-3 hover:border-info/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-info" />
                <span>ACTIVE TRADERS</span>
              </div>
              {/* Interval Switcher */}
              <div className="flex items-center gap-0.5 border border-border/80 bg-black p-0.5 text-[9px]">
                <button
                  type="button"
                  onClick={() => setActiveInterval('24h')}
                  className={`px-1.5 py-0.5 font-bold transition-colors ${
                    activeInterval === '24h' ? 'bg-info/20 text-info' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  24H
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInterval('weekly')}
                  className={`px-1.5 py-0.5 font-bold transition-colors ${
                    activeInterval === 'weekly' ? 'bg-info/20 text-info' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  WEEKLY
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInterval('monthly')}
                  className={`px-1.5 py-0.5 font-bold transition-colors ${
                    activeInterval === 'monthly' ? 'bg-info/20 text-info' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  MONTHLY
                </button>
              </div>
            </div>

            <div className="text-2xl font-bold text-info mt-2 tabular-nums">
              {formatFinancialNumber(activeValue)}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{activeLabel}</div>
          </div>

          {/* Sub-breakdown chips */}
          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-border/50 text-[9px]">
            <div
              onClick={() => setActiveInterval('24h')}
              className={`p-1 border cursor-pointer transition-colors ${
                activeInterval === '24h' ? 'border-info/50 bg-info/10 text-info font-bold' : 'border-border/40 text-muted-foreground'
              }`}
            >
              <div className="text-[8px] uppercase">24H</div>
              <div className="tabular-nums font-bold">{formatFinancialNumber(data.activeUsers24h)}</div>
            </div>
            <div
              onClick={() => setActiveInterval('weekly')}
              className={`p-1 border cursor-pointer transition-colors ${
                activeInterval === 'weekly' ? 'border-info/50 bg-info/10 text-info font-bold' : 'border-border/40 text-muted-foreground'
              }`}
            >
              <div className="text-[8px] uppercase">WEEK</div>
              <div className="tabular-nums font-bold">{formatFinancialNumber(data.activeUsersWeekly)}</div>
            </div>
            <div
              onClick={() => setActiveInterval('monthly')}
              className={`p-1 border cursor-pointer transition-colors ${
                activeInterval === 'monthly' ? 'border-info/50 bg-info/10 text-info font-bold' : 'border-border/40 text-muted-foreground'
              }`}
            >
              <div className="text-[8px] uppercase">MONTH</div>
              <div className="tabular-nums font-bold">{formatFinancialNumber(data.activeUsersMonthly)}</div>
            </div>
          </div>
        </div>

        {/* 3. Platform Growth & Trader Retention Rate Card */}
        <div className="border border-border bg-surface p-4 flex flex-col justify-between space-y-3 hover:border-accent/40 transition-colors md:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5 text-accent" />
                <span>USER ENGAGEMENT PULSE</span>
              </div>
              <span className="text-[9px] text-accent font-bold border border-accent/30 bg-accent/10 px-1.5 py-0.5">
                LIVE
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-bold text-accent tabular-nums">
                  {data.activeUsersMonthly > 0 && data.newUsersThisMonth > 0
                    ? `${Math.min(100, Math.round((data.activeUsersMonthly / Math.max(1, data.activeUsersMonthly + data.newUsersThisMonth)) * 100))}%`
                    : '100%'}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">30-DAY ACTIVE RETENTION INDEX</div>
              </div>
              <Users className="w-6 h-6 text-accent/30" />
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 text-[9px] text-muted-foreground flex items-center justify-between">
            <span>24H / 30D ACTIVE RATIO:</span>
            <span className="font-bold text-foreground tabular-nums">
              {data.activeUsersMonthly > 0
                ? `${Math.round((data.activeUsers24h / data.activeUsersMonthly) * 100)}%`
                : '100%'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
