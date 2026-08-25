'use client';

import React from 'react';
import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { useWorkersQuery } from '@/modules/operations/application/queries/use-workers';
import { getWorkerStats } from '@/shared/utils';

interface WorkersCardProps {
  onClose: () => void;
}

export const WorkersCard = React.memo(function WorkersCard({ onClose }: WorkersCardProps) {
  const { data: workers = [], isLoading, isError } = useWorkersQuery(10000);
  const { running, total } = getWorkerStats(workers);
  const isUnreachable = isError || (!isLoading && workers.length === 0);

  return (
    <div className="border border-border bg-surface p-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Wrench className={`w-3 h-3 ${isUnreachable ? 'text-negative' : 'text-positive'}`} />
          WORKERS ({running}/{total})
        </span>
        <Link
          href="/maintenance"
          onClick={onClose}
          className="text-accent hover:underline text-[9px] uppercase font-bold"
        >
          [MANAGE]
        </Link>
      </div>
      <div
        className={`text-base font-bold tabular-nums ${isUnreachable ? 'text-negative' : 'text-positive'}`}
      >
        {isUnreachable ? (
          <span className="text-xs">WORKER STATUS UNAVAILABLE</span>
        ) : (
          <>
            {running}{' '}
            <span className="text-xs text-muted-foreground font-normal">/ {total} Running</span>
          </>
        )}
      </div>
      <div className="space-y-1 pt-1 border-t border-border/40 text-[10px]">
        {workers.slice(0, 3).map((w) => (
          <div key={w.id} className="flex items-center justify-between">
            <span className="truncate max-w-[110px] text-muted-foreground">{w.name}</span>
            <span
              className={`text-[9px] px-1 font-bold ${
                w.status === 'running'
                  ? 'text-positive'
                  : w.status === 'paused'
                    ? 'text-accent'
                    : 'text-negative'
              }`}
            >
              {w.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
