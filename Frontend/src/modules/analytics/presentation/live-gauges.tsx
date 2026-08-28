'use client';

import React from 'react';
import {
  Users,
  Radio,
  MessageSquare,
  Zap,
  Database,
  Clock,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { formatFinancialNumber, formatUptime, getDbPoolStats } from '@/shared/utils';
import type { SystemMetrics } from '@/modules/analytics/domain/entities/SystemMetrics';

interface LiveGaugesProps {
  metrics?: SystemMetrics;
  deltas?: {
    totalUsers: number;
    activeSessions: number;
    totalChats: number;
    totalTokensUsed: number;
  };
  isLoading?: boolean;
  isError?: boolean;
  /** True when the ops SSE channel is connected (metrics arrive via push). */
  isStreaming?: boolean;
}

export function LiveGauges({
  metrics,
  deltas,
  isLoading,
  isError,
  isStreaming = false
}: LiveGaugesProps) {
  if (isLoading && !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-border bg-surface p-3 animate-pulse h-24">
            <div className="h-3 bg-border w-24 mb-2"></div>
            <div className="h-6 bg-border w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (isError && !metrics) {
    return (
      <div className="border border-negative/40 bg-negative/5 p-8 text-center font-mono">
        <p className="text-xs text-negative font-bold">SYSTEM METRICS GATEWAY OFFLINE</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Unable to retrieve real-time infrastructure metrics.
        </p>
      </div>
    );
  }

  const data = metrics || {
    totalUsers: 0,
    activeSessions: 0,
    totalChats: 0,
    totalTokensUsed: 0,
    dbPoolActive: 0,
    dbPoolIdle: 0,
    uptimeSeconds: 0
  };

  const { total: poolTotal, usagePct: poolActivePercent } = getDbPoolStats(
    data.dbPoolActive,
    data.dbPoolIdle
  );

  const renderDelta = (delta: number) => {
    if (!delta || delta === 0) return null;
    const isPositive = delta > 0;
    return (
      <span
        className={`inline-flex items-center text-[10px] font-mono font-bold ${
          isPositive ? 'text-positive' : 'text-negative'
        }`}
      >
        {isPositive ? (
          <ArrowUp className="w-2.5 h-2.5 mr-0.5" />
        ) : (
          <ArrowDown className="w-2.5 h-2.5 mr-0.5" />
        )}
        {Math.abs(delta)}
      </span>
    );
  };

  return (
    <div className="space-y-2">
      {/* Section Header */}
      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
        <span className="flex items-center gap-1.5 text-accent font-bold">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse"></span>
          {isStreaming ? '[LIVE GAUGES // SSE PUSH]' : '[LIVE GAUGES // IDLE]'}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {isStreaming ? 'SERVER PUSH ACTIVE' : 'STREAM DISCONNECTED'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 font-mono">
        {/* Total Users */}
        <div className="border border-border bg-surface p-3 hover:border-accent/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-[10px]">
            <span>TOTAL USERS</span>
            <Users className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-foreground tabular-nums">
              {formatFinancialNumber(data.totalUsers)}
            </span>
            {deltas && renderDelta(deltas.totalUsers)}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1">ACCOUNTS CREATED</div>
        </div>

        {/* Active Sessions */}
        <div className="border border-border bg-surface p-3 hover:border-accent/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-[10px]">
            <span>ACTIVE SESSIONS</span>
            <Radio className="w-3.5 h-3.5 text-positive animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-positive tabular-nums">
              {formatFinancialNumber(data.activeSessions)}
            </span>
            {deltas && renderDelta(deltas.activeSessions)}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1">CONNECTED CLIENTS</div>
        </div>

        {/* Total Chats */}
        <div className="border border-border bg-surface p-3 hover:border-accent/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-[10px]">
            <span>TOTAL CHATS</span>
            <MessageSquare className="w-3.5 h-3.5 text-info" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-foreground tabular-nums">
              {formatFinancialNumber(data.totalChats)}
            </span>
            {deltas && renderDelta(deltas.totalChats)}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1">AI INFERENCES RUN</div>
        </div>

        {/* Total Tokens Used */}
        <div className="border border-border bg-surface p-3 hover:border-accent/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-[10px]">
            <span>TOKENS PROCESSED</span>
            <Zap className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-accent tabular-nums">
              {formatFinancialNumber(data.totalTokensUsed)}
            </span>
            {deltas && renderDelta(deltas.totalTokensUsed)}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1">INPUT + OUTPUT TOKENS</div>
        </div>

        {/* Database Connection Pool */}
        <div className="border border-border bg-surface p-3 hover:border-accent/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-[10px]">
            <span>DB POOL STATUS</span>
            <Database className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-bold text-foreground tabular-nums">
              {data.dbPoolActive}{' '}
              <span className="text-xs text-muted-foreground font-normal">/ {poolTotal}</span>
            </span>
            <span className="text-[10px] text-accent font-bold tabular-nums">
              {poolActivePercent}%
            </span>
          </div>
          <div className="w-full bg-border h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-accent h-full transition-all duration-500"
              style={{ width: `${poolActivePercent}%` }}
            ></div>
          </div>
        </div>

        {/* System Uptime */}
        <div className="border border-border bg-surface p-3 hover:border-accent/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-[10px]">
            <span>SYSTEM UPTIME</span>
            <Clock className="w-3.5 h-3.5 text-info" />
          </div>
          <div className="mt-2">
            <span className="text-base font-bold text-foreground tabular-nums">
              {formatUptime(data.uptimeSeconds)}
            </span>
          </div>
          <div
            className={`text-[9px] font-bold mt-1 ${isError ? 'text-negative' : 'text-positive'}`}
          >
            {isError ? 'GATEWAY OFFLINE' : 'FASTIFY 5 ACTIVE'}
          </div>
        </div>
      </div>
    </div>
  );
}
