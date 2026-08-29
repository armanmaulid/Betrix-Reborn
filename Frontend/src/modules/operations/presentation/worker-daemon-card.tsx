'use client';

import React from 'react';
import { Play, Pause, Square, RotateCw } from 'lucide-react';
import { formatFinancialNumber, formatUptime } from '@/shared/utils';
import { StatusBadge } from '@/shared/presentation/ui/status-badge';
import type {
  BackgroundWorker,
  WorkerAction
} from '@/modules/operations/domain/entities/BackgroundWorker';

export interface WorkerDaemonCardProps {
  worker: BackgroundWorker;
  onControl: (workerId: string, action: WorkerAction) => void;
  isControlling: boolean;
}

export function WorkerDaemonCard({ worker, onControl, isControlling }: WorkerDaemonCardProps) {
  return (
    <div className="border border-border bg-black/60 p-4 flex flex-col justify-between space-y-3">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="text-xs font-bold text-foreground select-all">{worker.name}</div>
          <StatusBadge status={worker.status} />
        </div>
        <div className="text-[10px] text-muted-foreground line-clamp-2">{worker.description}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-border/40 pt-2 text-muted-foreground">
        <div>
          UPTIME: <strong className="text-foreground">{formatUptime(worker.uptimeSeconds)}</strong>
        </div>
        <div>
          INTERVAL: <strong className="text-foreground">{worker.interval}</strong>
        </div>
        <div>
          PROCESSED:{' '}
          <strong className="text-foreground">
            {formatFinancialNumber(worker.processedCount)}
          </strong>
        </div>
        <div>
          ERRORS:{' '}
          <strong className={worker.hasErrors() ? 'text-negative font-bold' : 'text-foreground'}>
            {worker.errorCount}
          </strong>
        </div>
      </div>

      {worker.lastError && (
        <div className="text-[9px] text-negative font-mono bg-negative/10 border border-negative/20 p-1.5 truncate select-all">
          ERR: {worker.lastError}
        </div>
      )}

      {/* Worker Control Actions */}
      <div className="flex items-center justify-end gap-1.5 border-t border-border/40 pt-2.5">
        {worker.isPaused() || worker.status === 'stopped' ? (
          <button
            onClick={() => onControl(worker.id, 'start')}
            disabled={isControlling}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold border border-positive/40 bg-positive/10 text-positive hover:bg-positive hover:text-black transition-colors disabled:opacity-50 cursor-pointer"
            title="Start Worker Daemon"
          >
            <Play className="w-2.5 h-2.5" />
            <span>START</span>
          </button>
        ) : (
          <button
            onClick={() => onControl(worker.id, 'pause')}
            disabled={isControlling}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors disabled:opacity-50 cursor-pointer"
            title="Pause Worker Daemon"
          >
            <Pause className="w-2.5 h-2.5" />
            <span>PAUSE</span>
          </button>
        )}

        <button
          onClick={() => onControl(worker.id, 'stop')}
          disabled={isControlling || worker.status === 'stopped'}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold border border-border bg-black hover:border-negative hover:text-negative text-muted-foreground transition-colors disabled:opacity-50 cursor-pointer"
          title="Stop Worker Daemon"
        >
          <Square className="w-2.5 h-2.5" />
          <span>STOP</span>
        </button>

        <button
          onClick={() => onControl(worker.id, 'restart')}
          disabled={isControlling}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors disabled:opacity-50 cursor-pointer"
          title="Restart Worker Daemon"
        >
          <RotateCw className="w-2.5 h-2.5" />
          <span>RESTART</span>
        </button>
      </div>
    </div>
  );
}
