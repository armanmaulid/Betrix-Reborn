'use client';

import React from 'react';
import Link from 'next/link';
import { Radio } from 'lucide-react';
import { useTelemetry } from '../telemetry-context';
import { getWorkerStats } from '@/shared/utils';

export const StreamStatusItem = React.memo(function StreamStatusItem() {
  const { workers, workersError: isWorkersError } = useTelemetry();
  const { isWsLive } = getWorkerStats(workers);

  return (
    <Link
      href="/stream-symbols"
      className="flex items-center space-x-1.5 shrink-0 hover:text-accent transition-colors"
      title="Click to view real-time stream symbols"
    >
      <Radio className={`w-2.5 h-2.5 ${isWorkersError ? 'text-negative' : 'text-info'}`} />
      <span className="text-muted-foreground">STREAM:</span>
      <span
        className={
          isWorkersError
            ? 'text-negative font-bold'
            : isWsLive
              ? 'text-info font-bold'
              : 'text-muted-foreground'
        }
      >
        {isWorkersError ? 'OFFLINE' : isWsLive ? 'WS/SSE LIVE' : 'IDLE'}
      </span>
    </Link>
  );
});
