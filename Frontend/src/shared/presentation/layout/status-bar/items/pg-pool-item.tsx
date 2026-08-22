'use client';

import React from 'react';
import { Database } from 'lucide-react';
import { useSystemMetrics } from '@/modules/analytics/application/queries/use-metrics';
import { getDbPoolStats } from '@/shared/utils';

export const PgPoolItem = React.memo(function PgPoolItem() {
  const { metrics, isLoading, isError } = useSystemMetrics(15000);
  const { active, total, usagePct, idle } = getDbPoolStats(metrics?.dbPoolActive, metrics?.dbPoolIdle);

  return (
    <div className="hidden sm:flex items-center space-x-1.5 shrink-0" title={`DB Pool: ${active} active / ${idle} idle`}>
      <Database className="w-2.5 h-2.5 text-accent" />
      <span className="text-muted-foreground">PG POOL:</span>
      <span
        className={`font-bold tabular-nums ${
          isError ? 'text-negative' : 'text-foreground'
        }`}
      >
        {isLoading
          ? 'SYNCING...'
          : isError
          ? 'UNREACHABLE'
          : `${active}/${total} (${usagePct}%)`}
      </span>
    </div>
  );
});
