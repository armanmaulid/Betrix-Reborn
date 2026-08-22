'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { CHART_COLORS } from '@/shared/utils/chart-colors';
import { formatFinancialNumber } from '@/shared/utils';

export type TokenPeriod = 'daily' | 'weekly' | 'monthly' | 'custom' | 'all';

interface TokenUsageChartProps {
  data?: { date: string; tokens: number }[];
  isLoading?: boolean;
  period?: TokenPeriod;
  onPeriodChange?: (period: TokenPeriod, startDate?: string, endDate?: string) => void;
}

export function TokenUsageChart({
  data = [],
  isLoading,
  period = 'daily',
  onPeriodChange
}: TokenUsageChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TokenPeriod>(period);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Sync internal state when the parent-driven `period` prop changes
  React.useEffect(() => {
    setSelectedPeriod(period);
  }, [period]);

  const chartData = data;

  const totalTokensInPeriod = chartData.reduce((acc, curr) => acc + (curr.tokens || 0), 0);

  const handlePeriodClick = (p: TokenPeriod) => {
    setSelectedPeriod(p);
    if (p !== 'custom') {
      onPeriodChange?.(p);
    }
  };

  const handleApplyCustom = () => {
    if (customStart || customEnd) {
      onPeriodChange?.('custom', customStart || undefined, customEnd || undefined);
    }
  };

  const periodTitles: Record<TokenPeriod, string> = {
    daily: 'DAILY TOKEN CONSUMPTION (14-DAY)',
    weekly: 'WEEKLY TOKEN CONSUMPTION (12-WEEK)',
    monthly: 'MONTHLY TOKEN CONSUMPTION (12-MONTH)',
    all: 'ALL-TIME TOKEN CONSUMPTION',
    custom: 'CUSTOM DATE RANGE TOKEN CONSUMPTION'
  };

  return (
    <div className="border border-border bg-surface p-4 flex flex-col justify-between font-mono h-full">
      {/* Chart Header & Controls */}
      <div className="space-y-3 pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-foreground tracking-wider uppercase">
                {periodTitles[selectedPeriod]}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Authentic historical token telemetry from Backend API
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[10px] text-muted-foreground uppercase">INTERVAL SUM</div>
            <div className="text-xs font-bold text-accent tabular-nums">
              {formatFinancialNumber(totalTokensInPeriod)} TOKENS
            </div>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          {(['daily', 'weekly', 'monthly', 'all', 'custom'] as TokenPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePeriodClick(p)}
              className={`px-2 py-0.5 border font-bold uppercase tracking-wider transition-colors ${
                selectedPeriod === p
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-border bg-black text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'all' ? 'ALL TIME' : p}
            </button>
          ))}
        </div>

        {/* Custom Date Range Inputs (Only shown when custom is selected) */}
        {selectedPeriod === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="w-3 h-3 text-accent" />
              <span>FROM:</span>
            </div>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-black border border-border px-2 py-0.5 text-[10px] text-foreground focus:outline-none focus:border-accent"
            />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-1">
              <span>TO:</span>
            </div>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-black border border-border px-2 py-0.5 text-[10px] text-foreground focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handleApplyCustom}
              className="border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-2 py-0.5 text-[10px] font-bold uppercase transition-colors"
            >
              QUERY RANGE
            </button>
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full mt-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
            LOADING TIME-SERIES TELEMETRY...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground border border-dashed border-border p-4 text-center">
            <TrendingUp className="w-6 h-6 text-muted-foreground/40 mb-2" />
            <span className="font-bold text-foreground">NO TOKEN CONSUMPTION IN INTERVAL</span>
            <span className="text-[10px] text-muted-foreground mt-1">Token telemetry will plot automatically once inference cycles execute</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} vertical={false} />
              <XAxis
                dataKey="date"
                stroke={CHART_COLORS.mutedText}
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.border }}
              />
              <YAxis
                stroke={CHART_COLORS.mutedText}
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.border }}
                tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
              />
              <Tooltip
                cursor={{ stroke: CHART_COLORS.accent, strokeWidth: 1, strokeDasharray: '3 3' }}
                wrapperStyle={{ outline: 'none', backgroundColor: 'transparent', border: 'none' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const value = payload[0].value as number;
                    return (
                      <div className="border border-accent bg-black p-2.5 shadow-2xl font-mono text-xs">
                        <div className="text-muted-foreground text-[10px] uppercase">{label}</div>
                        <div className="text-accent font-bold mt-1 tabular-nums">
                          {formatFinancialNumber(value)} TOKENS
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="tokens"
                stroke={CHART_COLORS.accent}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#tokenGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
