'use client';

import React from 'react';
import Link from 'next/link';
import { Radio } from 'lucide-react';
import { useWorkersQuery } from '@/modules/operations/application/queries/use-workers';
import { getWorkerStats } from '@/shared/utils';

interface StreamGatewayCardProps {
  onClose: () => void;
}

export const StreamGatewayCard = React.memo(function StreamGatewayCard({
  onClose
}: StreamGatewayCardProps) {
  const { data: workers = [], isLoading, isError } = useWorkersQuery(10000);
  const { isWsLive, wsWorker } = getWorkerStats(workers);
  const isUnknown = isError || (!isLoading && workers.length === 0);

  return (
    <div className="border border-border bg-surface p-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Radio className="w-3 h-3 text-info" />
          STREAM GATEWAY
        </span>
        <Link
          href="/stream-symbols"
          onClick={onClose}
          className="text-accent hover:underline text-[9px] uppercase font-bold"
        >
          [SYMBOLS]
        </Link>
      </div>
      <div className={`text-base font-bold tabular-nums ${isUnknown ? 'text-muted-foreground' : 'text-info'}`}>
        {isUnknown ? 'STATUS UNKNOWN' : isWsLive ? 'LIVE SSE HUB' : 'OFFLINE'}
      </div>
      <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/50">
        <div className="flex justify-between">
          <span>WS INGESTER:</span>
          <span className={isWsLive ? 'text-positive font-bold' : 'text-negative'}>
            {wsWorker?.status?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>DISPATCH:</span>
          <span className="text-foreground">FASTIFY SSE</span>
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground/70">
          <span>INTERVAL:</span>
          <span>{wsWorker?.interval || '<50ms'}</span>
        </div>
      </div>
    </div>
  );
});
