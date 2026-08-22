'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { useSystemMetrics } from '@/modules/analytics/application/queries/use-metrics';

export const SessionsStatusItem = React.memo(function SessionsStatusItem() {
  const { metrics, isLoading, isError } = useSystemMetrics(15000);

  const count = metrics?.activeSessions ?? 0;

  return (
    <div className="hidden lg:flex items-center space-x-1.5 shrink-0" title={`Active Trader Sessions: ${count}`}>
      <Users className={`w-2.5 h-2.5 ${isError ? 'text-negative' : 'text-accent'}`} />
      <span className="text-muted-foreground">SESSIONS:</span>
      <span
        className={`font-bold tabular-nums ${
          isError ? 'text-negative' : 'text-foreground'
        }`}
      >
        {isLoading ? '...' : isError ? 'ERR' : `${count} ACTIVE`}
      </span>
    </div>
  );
});
