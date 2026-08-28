'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { useTelemetry } from '../telemetry-context';

export const RedisStoreCard = React.memo(function RedisStoreCard() {
  const { metrics, metricsError: isError } = useTelemetry();

  const isHealthy = metrics?.redisStatus === 'healthy';

  return (
    <div className="border border-border bg-surface p-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-positive" />
          REDIS IN-MEMORY
        </span>
        <span
          className={`font-bold ${
            isHealthy ? 'text-positive' : isError ? 'text-negative' : 'text-accent'
          }`}
        >
          {isHealthy ? 'ACTIVE' : isError ? 'OFFLINE' : 'SYNCING...'}
        </span>
      </div>
      <div
        className={`text-base font-bold tabular-nums ${
          isHealthy ? 'text-positive' : 'text-negative'
        }`}
      >
        {isHealthy
          ? `HEALTHY (${metrics?.redisLatencyMs ?? 0}ms)`
          : isError
            ? 'OFFLINE'
            : 'CONNECTING...'}
      </div>
      <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/50">
        <div className="flex justify-between">
          <span>STREAM TICKETS:</span>
          <span className="text-foreground">60s TTL CACHE</span>
        </div>
        <div className="flex justify-between">
          <span>QUOTE CACHE:</span>
          <span className="text-foreground">IN-MEMORY L1</span>
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground/70">
          <span>ENGINE:</span>
          <span>UPSTASH / REDIS 7</span>
        </div>
      </div>
    </div>
  );
});
