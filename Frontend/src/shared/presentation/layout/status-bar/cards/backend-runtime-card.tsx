'use client';

import React from 'react';
import { Cpu } from 'lucide-react';
import { useSystemMetrics } from '@/modules/analytics/application/queries/use-metrics';
import { formatUptime } from '@/shared/utils';

export const BackendRuntimeCard = React.memo(function BackendRuntimeCard() {
  const { metrics } = useSystemMetrics(15000);

  const uptime = metrics?.uptimeSeconds;

  return (
    <div className="border border-border bg-surface p-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-accent" />
          FASTIFY RUNTIME
        </span>
        <span className="text-positive font-bold">NODE.JS</span>
      </div>
      <div className="text-base font-bold text-foreground tabular-nums">
        {uptime ? formatUptime(uptime) : 'SYNCING...'}
        <span className="text-xs text-muted-foreground font-normal"> Uptime</span>
      </div>
      <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/50">
        <div className="flex justify-between">
          <span>HOST ENV:</span>
          <span className="text-foreground font-bold">{process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV'}</span>
        </div>
        <div className="flex justify-between">
          <span>SECURITY:</span>
          <span className="text-positive font-bold">JWT + HTTPONLY</span>
        </div>
        <div className="flex justify-between">
          <span>ACTIVE SESSIONS:</span>
          <span className="text-foreground font-bold">{metrics?.activeSessions ?? 0}</span>
        </div>
      </div>
    </div>
  );
});
