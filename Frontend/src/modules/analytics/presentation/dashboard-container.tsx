'use client';

import React, { useState } from 'react';
import { useSystemMetrics } from '@/modules/analytics/application/queries/use-metrics';
import { useUserAnalytics } from '@/modules/analytics/application/queries/use-analytics';
import { LiveGauges } from './live-gauges';
import { AnalyticsSummary } from './analytics-summary';
import { TokenUsageChart, type TokenPeriod } from './token-usage-chart';
import { TopModelsChart } from './top-models-chart';
import { Cpu, Terminal, RefreshCw } from 'lucide-react';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import { PageHeader } from '@/shared/presentation/ui/page-header';

export function DashboardContainer() {
  usePageTitle('SYSTEM OVERVIEW');
  const { success, error } = useToast();
  const [tokenPeriod, setTokenPeriod] = useState<TokenPeriod>('daily');
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  const {
    metrics,
    deltas,
    isLoading: isMetricsLoading,
    isError: isMetricsError,
    isRefetching: isMetricsRefetching,
    refetch: refetchMetrics
  } = useSystemMetrics(15000);

  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isError: isAnalyticsError,
    isRefetching: isAnalyticsRefetching,
    refetch: refetchAnalytics
  } = useUserAnalytics({
    period: tokenPeriod,
    startDate,
    endDate
  });

  const handleTokenPeriodChange = (p: TokenPeriod, start?: string, end?: string) => {
    setTokenPeriod(p);
    setStartDate(start);
    setEndDate(end);
  };

  const handleSyncAll = async () => {
    try {
      await Promise.all([refetchMetrics(), refetchAnalytics()]);
      success('DATASET SYNCED', 'Metrics and analytics refreshed.');
    } catch {
      error('SYNC FAILED', 'Unable to refresh telemetry dataset.');
    }
  };

  return (
    <div className="space-y-3 font-mono">
      <PageHeader
        title="EXECUTIVE TELEMETRY & OPERATIONS COMMAND"
        icon={Terminal}
        subtitle="Real-time infrastructure capacity, token consumption metrics, and model analytics"
        actions={
          <>
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-black border border-border text-[11px]">
              <Cpu className="w-3.5 h-3.5 text-accent" />
              <span className="text-muted-foreground">CLUSTER:</span>
              <span className="text-positive font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
                OPERATIONAL
              </span>
            </div>

            <button
              onClick={handleSyncAll}
              disabled={isMetricsRefetching || isAnalyticsRefetching}
              className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              title="Sync all metrics"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isMetricsRefetching || isAnalyticsRefetching ? 'animate-spin' : ''}`}
              />
              <span>SYNC ALL</span>
            </button>
          </>
        }
      />

      {/* 1. Live Real-time System Gauges (Top Row) */}
      <LiveGauges
        metrics={metrics as any}
        deltas={deltas}
        isLoading={isMetricsLoading}
        isError={isMetricsError}
      />

      {/* 2. Interval Analytics Summary Cards */}
      <AnalyticsSummary
        analytics={analytics}
        isLoading={isAnalyticsLoading}
        isError={isAnalyticsError}
        onRefresh={() => refetchAnalytics()}
        isRefetching={isAnalyticsRefetching}
      />

      {/* 3. Deep Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Usage Over Time (2 Cols) */}
        <div className="lg:col-span-2">
          <TokenUsageChart
            data={analytics?.dailyTokenUsage || []}
            period={tokenPeriod}
            onPeriodChange={handleTokenPeriodChange}
            isLoading={isAnalyticsLoading}
          />
        </div>

        {/* Top Models Distribution (1 Col) */}
        <div>
          <TopModelsChart data={analytics?.topModels || []} isLoading={isAnalyticsLoading} />
        </div>
      </div>
    </div>
  );
}
