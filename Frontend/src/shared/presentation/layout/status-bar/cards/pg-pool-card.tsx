'use client';

import React from 'react';
import { Database } from 'lucide-react';
import { useSystemMetrics } from '@/modules/analytics/application/queries/use-metrics';
import { getDbPoolStats } from '@/shared/utils';

export const PgPoolCard = React.memo(function PgPoolCard() {
  const { metrics } = useSystemMetrics(15000);
  const { active, idle, total, usagePct } = getDbPoolStats(metrics?.dbPoolActive, metrics?.dbPoolIdle);

  return (
    <div className="border border-border bg-surface p-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Database className="w-3 h-3 text-accent" />
          POSTGRESQL POOL
        </span>
        <span className="text-accent font-bold">{usagePct}% LOAD</span>
      </div>
      <div className="text-base font-bold text-foreground tabular-nums">
        {active} <span className="text-xs text-muted-foreground font-normal">/ {total} Conns</span>
      </div>
      <div className="w-full bg-black h-1.5 border border-border/80 overflow-hidden">
        <div
          className="bg-accent h-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(5, usagePct))}%` }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/50">
        <div className="flex justify-between">
          <span>ACTIVE / IDLE:</span>
          <span className="text-foreground">{active} / {idle}</span>
        </div>
        <div className="flex justify-between">
          <span>POOL LIMIT:</span>
          <span className="text-foreground">{total} Max</span>
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground/70">
          <span>DRIVER:</span>
          <span>DRIZZLE + PG</span>
        </div>
      </div>
    </div>
  );
});
