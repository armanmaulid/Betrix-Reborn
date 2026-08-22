'use client';

import React from 'react';
import { Timer } from 'lucide-react';
import { useSystemMetrics } from '@/modules/analytics/application/queries/use-metrics';
import { formatUptime } from '@/shared/utils';

export const UptimeItem = React.memo(function UptimeItem() {
  const { metrics, isLoading, isError } = useSystemMetrics(15000);

  const uptime = metrics?.uptimeSeconds;

  return (
    <div
      className="hidden lg:flex items-center space-x-1.5 shrink-0 text-muted-foreground"
      title={`Backend Fastify Server Uptime: ${uptime ? `${uptime}s (${formatUptime(uptime)})` : 'Syncing from backend...'}`}
    >
      <Timer className={`w-2.5 h-2.5 ${isError ? 'text-negative' : 'text-positive'}`} />
      <span>UP:</span>
      <span
        className={`tabular-nums font-bold ${
          isError ? 'text-negative' : 'text-foreground'
        }`}
      >
        {isLoading
          ? '...'
          : isError || !uptime
          ? 'OFFLINE'
          : formatUptime(uptime)}
      </span>
    </div>
  );
});
