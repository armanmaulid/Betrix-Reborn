'use client';

import React, { useState } from 'react';
import { useSystemMetrics } from '@/lib/queries/use-metrics';
import { useUserAnalytics } from '@/lib/queries/use-analytics';
import { LiveGauges } from '@/components/dashboard/live-gauges';
import { AnalyticsSummary } from '@/components/dashboard/analytics-summary';
import { TokenUsageChart, type TokenPeriod } from '@/components/dashboard/token-usage-chart';
import { TopModelsChart } from '@/components/dashboard/top-models-chart';
import { ShieldCheck, Cpu, Terminal } from 'lucide-react';

export default function DashboardPage() {
  const [tokenPeriod, setTokenPeriod] = useState<TokenPeriod>('daily');
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  const {
    metrics,
    deltas,
    isLoading: isMetricsLoading,
    isRefetching: isMetricsRefetching,
    refetch: refetchMetrics
  } = useSystemMetrics(15000);

  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
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

  const handleSyncAll = () => {
    refetchMetrics();
    refetchAnalytics();
  };

  return (
    <div className="space-y-6">
      {/* Top Operations Titlebar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 bg-accent inline-block animate-pulse"></span>
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              BETRIX TERMINAL // OPERATIONS DASHBOARD
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time telemetry, model consumption metrics, and user growth analytics
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="hidden md:flex items-center space-x-1.5 border border-border bg-black px-2.5 py-1 text-muted-foreground">
            <Cpu className="w-3 h-3 text-info" />
            <span>NODE FASTIFY REST</span>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={isMetricsRefetching || isAnalyticsRefetching}
            className="flex items-center space-x-1.5 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-1 font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            <span>SYNC DATASET</span>
          </button>
        </div>
      </div>

      {/* 1. Live Gauges Section (15s Polling) */}
      <LiveGauges
        metrics={metrics}
        deltas={deltas}
        isLoading={isMetricsLoading}
      />

      {/* 2. User Acquisition & Growth Analytics */}
      <AnalyticsSummary
        analytics={analytics}
        isLoading={isAnalyticsLoading}
        onRefresh={refetchAnalytics}
        isRefetching={isAnalyticsRefetching}
      />

      {/* 3. Charts Telemetry (Time-Series & Model Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TokenUsageChart
          data={analytics?.dailyTokenUsage}
          isLoading={isAnalyticsLoading}
          period={tokenPeriod}
          onPeriodChange={handleTokenPeriodChange}
        />
        <TopModelsChart
          data={analytics?.topModels}
          isLoading={isAnalyticsLoading}
        />
      </div>

      {/* 4. Infrastructure Terminal Footer */}
      <div className="border border-border bg-black p-3 font-mono text-[11px] text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-accent" />
          <span>INVARIANT: Metrics point-in-time snapshot with client delta calculation. Daily token usage authentic time-series.</span>
        </div>
        <div className="flex items-center gap-2 text-positive font-bold shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>AUDIT COMPLIANT</span>
        </div>
      </div>
    </div>
  );
}
