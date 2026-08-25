'use client';

import React from 'react';
import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { useWorkersQuery } from '@/modules/operations/application/queries/use-workers';
import { getWorkerStats } from '@/shared/utils';

export const WorkersStatusItem = React.memo(function WorkersStatusItem() {
  const { data: workers = [], isLoading, isError } = useWorkersQuery(10000);
  const { running, total } = getWorkerStats(workers);

  return (
    <Link
      href="/maintenance"
      className="hidden md:flex items-center space-x-1.5 shrink-0 hover:text-accent transition-colors"
      title="Click to manage background workers"
    >
      <Wrench className={`w-2.5 h-2.5 ${isError ? 'text-negative' : 'text-positive'}`} />
      <span className="text-muted-foreground">WORKERS:</span>
      <span
        className={`font-bold tabular-nums ${
          isError
            ? 'text-negative'
            : isLoading
              ? 'text-muted-foreground'
              : running === total
                ? 'text-positive'
                : 'text-accent'
        }`}
      >
        {isLoading ? '...' : isError ? 'OFFLINE' : `${running}/${total} ACTIVE`}
      </span>
    </Link>
  );
});
