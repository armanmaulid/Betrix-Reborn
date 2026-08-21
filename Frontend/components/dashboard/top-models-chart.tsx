'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { Cpu } from 'lucide-react';
import { CHART_COLORS } from '@/lib/chart-colors';
import { formatFinancialNumber } from '@/lib/utils';

interface TopModelsChartProps {
  data?: { model: string; count: number }[];
  isLoading?: boolean;
}

export function TopModelsChart({ data = [], isLoading }: TopModelsChartProps) {
  const chartData = data.length > 0 ? data : [
    { model: 'NO_MODELS', count: 0 }
  ];

  const barPalette = [
    CHART_COLORS.accent,
    CHART_COLORS.info,
    CHART_COLORS.positive,
    CHART_COLORS.accentDim
  ];

  return (
    <div className="border border-border bg-surface p-4 flex flex-col justify-between font-mono h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-info" />
            <span className="text-xs font-bold text-foreground tracking-wider uppercase">
              AI MODEL FLEET UTILIZATION
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Token & execution breakdown across active intelligence models
          </p>
        </div>
        <div className="text-[10px] text-info font-bold uppercase tracking-wider">
          ACTIVE MODELS: {chartData.filter(d => d.model !== 'NO_MODELS').length}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full mt-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
            LOADING MODEL TELEMETRY...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} vertical={false} />
              <XAxis
                dataKey="model"
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
                cursor={false}
                wrapperStyle={{ outline: 'none', backgroundColor: 'transparent', border: 'none' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const count = payload[0].value as number;
                    return (
                      <div className="border border-info bg-black p-2.5 shadow-2xl font-mono text-xs">
                        <div className="text-muted-foreground text-[10px] uppercase">MODEL: {label}</div>
                        <div className="text-info font-bold mt-1 tabular-nums">
                          {formatFinancialNumber(count)} INFERENCES
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]} activeBar={false}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={barPalette[index % barPalette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
