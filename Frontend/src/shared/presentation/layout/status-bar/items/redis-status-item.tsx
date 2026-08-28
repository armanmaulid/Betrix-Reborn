'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { useTelemetry } from '../telemetry-context';

export const RedisStatusItem = React.memo(function RedisStatusItem() {
  const { metrics, metricsLoading: isLoading, metricsError: isError } = useTelemetry();

  const isHealthy = metrics?.redisStatus === 'healthy';

  return (
    <div
      className="hidden sm:flex items-center space-x-1.5 shrink-0"
      title={`Redis In-Memory Store: ${metrics?.redisStatus || 'connecting'}`}
    >
      <Zap
        className={`w-2.5 h-2.5 ${isHealthy ? 'text-positive' : isError ? 'text-negative' : 'text-accent'}`}
      />
      <span className="text-muted-foreground">REDIS:</span>
      <span
        className={`font-bold tabular-nums ${
          isHealthy ? 'text-positive' : isError ? 'text-negative' : 'text-accent'
        }`}
      >
        {isLoading
          ? 'SYNCING...'
          : isHealthy
            ? `OK${metrics?.redisLatencyMs !== undefined ? ` (${metrics.redisLatencyMs}ms)` : ''}`
            : isError
              ? 'OFFLINE'
              : 'IDLE'}
      </span>
    </div>
  );
});
