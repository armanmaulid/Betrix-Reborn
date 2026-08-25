'use client';

import React, { useState } from 'react';
import { UserPlus, Flame, RefreshCw, Users, TrendingUp } from 'lucide-react';
import { IntervalStatCard } from './interval-stat-card';
import type { UserAnalytics } from '@/modules/analytics/domain/entities/SystemMetrics';

interface AnalyticsSummaryProps {
  analytics?: UserAnalytics;
  isLoading?: boolean;
  isError?: boolean;
  onRefresh?: () => void;
  isRefetching?: boolean;
}

export function AnalyticsSummary({
  analytics,
  isLoading: _isLoading,
  isError,
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

  if (isError && !analytics) {
    return (
      <div className="border border-negative/40 bg-negative/5 p-6 text-center font-mono">
        <p className="text-xs text-negative font-bold">ANALYTICS GATEWAY UNREACHABLE</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Unable to retrieve user analytics data. Check backend connectivity.
        </p>
      </div>
    );
  }

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
            <RefreshCw
              className={`w-2.5 h-2.5 ${isRefetching ? 'animate-spin text-accent' : ''}`}
            />
            <span>SYNC</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
        {/* 1. New Registrations Card with Interval Tabs */}
        <IntervalStatCard<'today' | 'week' | 'month'>
          title="NEW REGISTRATIONS"
          icon={UserPlus}
          colorScheme="positive"
          prefix="+"
          selectedInterval={regInterval}
          onSelectInterval={setRegInterval}
          options={[
            {
              key: 'today',
              label: 'TODAY',
              shortLabel: 'TODAY',
              value: data.newUsersToday,
              description: 'SINCE 00:00 UTC'
            },
            {
              key: 'week',
              label: 'WEEK',
              shortLabel: 'WEEK',
              value: data.newUsersThisWeek,
              description: 'ROLLING 7-DAY INTERVAL'
            },
            {
              key: 'month',
              label: 'MONTH',
              shortLabel: 'MONTH',
              value: data.newUsersThisMonth,
              description: 'ROLLING 30-DAY INTERVAL'
            }
          ]}
        />

        {/* 2. Active Traders Card with Interval Tabs */}
        <IntervalStatCard<'24h' | 'weekly' | 'monthly'>
          title="ACTIVE TRADERS"
          icon={Flame}
          colorScheme="info"
          selectedInterval={activeInterval}
          onSelectInterval={setActiveInterval}
          options={[
            {
              key: '24h',
              label: '24H',
              shortLabel: '24H',
              value: data.activeUsers24h,
              description: 'LAST 24 HOURS ACTIVITY'
            },
            {
              key: 'weekly',
              label: 'WEEKLY',
              shortLabel: 'WEEK',
              value: data.activeUsersWeekly,
              description: 'LAST 7 DAYS ACTIVE'
            },
            {
              key: 'monthly',
              label: 'MONTHLY',
              shortLabel: 'MONTH',
              value: data.activeUsersMonthly,
              description: 'LAST 30 DAYS ACTIVE'
            }
          ]}
        />

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
                    : '—'}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">
                  30-DAY ACTIVE RETENTION INDEX
                </div>
              </div>
              <Users className="w-6 h-6 text-accent/30" />
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 text-[9px] text-muted-foreground flex items-center justify-between">
            <span>24H / 30D ACTIVE RATIO:</span>
            <span className="font-bold text-foreground tabular-nums">
              {data.activeUsersMonthly > 0
                ? `${Math.round((data.activeUsers24h / data.activeUsersMonthly) * 100)}%`
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
