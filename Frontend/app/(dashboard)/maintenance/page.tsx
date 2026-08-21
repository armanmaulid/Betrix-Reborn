'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Wrench,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Database,
  KeyRound,
  ShieldCheck,
  Info,
  Play,
  Pause,
  Square,
  RotateCw,
  Cpu,
  Activity,
  Radio,
  Clock,
  Layers
} from 'lucide-react';
import { z } from 'zod';
import { SystemCleanupSchema, type SystemCleanupInput } from '@/lib/schemas/admin.schema';
import { useCleanupMutation, type CleanupResult } from '@/lib/queries/use-maintenance';
import { useWorkersQuery, useControlWorkerMutation } from '@/lib/queries/use-workers';
import { DestructiveConfirmDialog } from '@/components/ui/destructive-confirm-dialog';
import { useToast } from '@/components/ui/terminal-toast';
import { formatFinancialNumber, formatUptime } from '@/lib/utils';
import type { BackgroundWorkerInfo, WorkerAction } from '@/lib/types';

export default function MaintenancePage() {
  const { success, error } = useToast();
  const cleanupMutation = useCleanupMutation();
  const controlWorkerMutation = useControlWorkerMutation();

  const {
    data: workers = [],
    isLoading: isWorkersLoading,
    isRefetching: isWorkersRefetching,
    refetch: refetchWorkers
  } = useWorkersQuery(5000);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<z.input<typeof SystemCleanupSchema>, any, SystemCleanupInput>({
    resolver: zodResolver(SystemCleanupSchema),
    defaultValues: {
      olderThanDays: 30
    }
  });

  const olderThanDaysValue = watch('olderThanDays', 30);

  const handleRunCleanup = async () => {
    try {
      const result = await cleanupMutation.mutateAsync({
        olderThanDays: Number(olderThanDaysValue)
      });
      setCleanupResult(result);
      success('MAINTENANCE COMPLETE', 'Database vacuum & retention purge completed.');
      setIsConfirmOpen(false);
    } catch (err: any) {
      error('CLEANUP FAILED', err.message || 'System cleanup operation failed.');
    }
  };

  const handleControlWorker = async (worker: BackgroundWorkerInfo, action: WorkerAction) => {
    try {
      await controlWorkerMutation.mutateAsync({ id: worker.id, action });
      success(
        `WORKER ${action.toUpperCase()}`,
        `Pipeline "${worker.name}" state transitioned to ${action === 'start' ? 'RUNNING' : action.toUpperCase()}.`
      );
    } catch (err: any) {
      error('WORKER CONTROL FAILED', err.message || `Failed to ${action} worker.`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold border border-positive/40 bg-positive/10 text-positive px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse"></span>
            RUNNING
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold border border-accent/40 bg-accent/10 text-accent px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent"></span>
            PAUSED
          </span>
        );
      case 'stopped':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold border border-negative/40 bg-negative/10 text-negative px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-negative"></span>
            STOPPED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold border border-border bg-black text-muted-foreground px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground"></span>
            {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-mono max-w-6xl mx-auto">
      {/* 1. Page Header */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              SYSTEM MAINTENANCE & BACKGROUND WORKER PIPELINES
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor real-time daemon processes, control background worker lifecycle, and execute database retention vacuums
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => refetchWorkers()}
            disabled={isWorkersRefetching}
            className="flex items-center space-x-1.5 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-1 font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3 h-3 ${isWorkersRefetching ? 'animate-spin' : ''}`} />
            <span>SYNC PIPELINES</span>
          </button>
        </div>
      </div>

      {/* 2. Background Workers & Telemetry Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-info" />
            <span className="text-info font-bold">[BACKGROUND WORKERS & DAEMON PIPELINES]</span>
          </div>
          <span className="text-[10px] text-muted-foreground">POLLING EVERY 5S</span>
        </div>

        {isWorkersLoading ? (
          <div className="border border-border bg-surface p-8 text-center text-xs text-muted-foreground animate-pulse">
            LOADING BACKGROUND WORKER TELEMETRY...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="border border-border bg-surface p-4 flex flex-col justify-between space-y-4 hover:border-accent/40 transition-colors"
              >
                <div>
                  {/* Worker Title & Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{worker.name}</span>
                        <span className="text-[9px] border border-border/80 bg-black px-1.5 py-0.2 text-muted-foreground uppercase">
                          {worker.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        CADENCE: <strong className="text-accent">{worker.interval}</strong>
                      </div>
                    </div>
                    {getStatusBadge(worker.status)}
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    {worker.description}
                  </p>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50 text-[10px]">
                    <div className="border border-border/60 bg-black p-2 space-y-0.5">
                      <div className="text-[9px] text-muted-foreground uppercase">PROCESSED</div>
                      <div className="text-xs font-bold text-foreground tabular-nums">
                        {formatFinancialNumber(worker.processedCount)}
                      </div>
                    </div>

                    <div className="border border-border/60 bg-black p-2 space-y-0.5">
                      <div className="text-[9px] text-muted-foreground uppercase">ERRORS</div>
                      <div className={`text-xs font-bold tabular-nums ${worker.errorCount > 0 ? 'text-negative' : 'text-positive'}`}>
                        {worker.errorCount}
                      </div>
                    </div>

                    <div className="border border-border/60 bg-black p-2 space-y-0.5">
                      <div className="text-[9px] text-muted-foreground uppercase">UPTIME</div>
                      <div className="text-xs font-bold text-foreground tabular-nums">
                        {worker.status === 'running' ? formatUptime(worker.uptimeSeconds) : '0m'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Worker Control Buttons */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">ID: {worker.id}</span>

                  <div className="flex items-center gap-1">
                    {/* START */}
                    {worker.status !== 'running' && (
                      <button
                        type="button"
                        onClick={() => handleControlWorker(worker, 'start')}
                        disabled={controlWorkerMutation.isPending}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase bg-positive/20 text-positive border border-positive/60 hover:bg-positive hover:text-black transition-colors disabled:opacity-50"
                        title="Start Worker"
                      >
                        <Play className="w-3 h-3" />
                        <span>START</span>
                      </button>
                    )}

                    {/* PAUSE */}
                    {worker.status === 'running' && (
                      <button
                        type="button"
                        onClick={() => handleControlWorker(worker, 'pause')}
                        disabled={controlWorkerMutation.isPending}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase bg-accent/20 text-accent border border-accent/60 hover:bg-accent hover:text-black transition-colors disabled:opacity-50"
                        title="Pause Worker"
                      >
                        <Pause className="w-3 h-3" />
                        <span>PAUSE</span>
                      </button>
                    )}

                    {/* STOP */}
                    {worker.status !== 'stopped' && (
                      <button
                        type="button"
                        onClick={() => handleControlWorker(worker, 'stop')}
                        disabled={controlWorkerMutation.isPending}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase bg-negative/20 text-negative border border-negative/60 hover:bg-negative hover:text-black transition-colors disabled:opacity-50"
                        title="Stop Worker"
                      >
                        <Square className="w-3 h-3" />
                        <span>STOP</span>
                      </button>
                    )}

                    {/* RESTART */}
                    <button
                      type="button"
                      onClick={() => handleControlWorker(worker, 'restart')}
                      disabled={controlWorkerMutation.isPending}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase bg-info/20 text-info border border-info/60 hover:bg-info hover:text-black transition-colors disabled:opacity-50"
                      title="Restart Worker Sequence"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>RESTART</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Database Retention & Purge Console */}
      <div className="space-y-3 pt-4 border-t border-border/80">
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
          <Database className="w-3.5 h-3.5 text-accent" />
          <span className="text-accent font-bold">[DATABASE RETENTION PURGE & VACUUM CONSOLE]</span>
        </div>

        {/* Info Card on Background Worker vs Manual Override */}
        <div className="border border-border bg-black p-4 flex items-start space-x-3 text-xs">
          <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
          <div className="space-y-1 text-muted-foreground leading-relaxed">
            <p className="text-foreground font-bold uppercase tracking-wider">
              AUTOMATIC HOURLY WORKER RECURRENCE
            </p>
            <p>
              The backend worker (<code className="text-accent">session-cleanup-job</code>) continuously executes background purges every 60 minutes for standard 30-day retention.
              This manual administrative console provides an immediate emergency override with custom retention thresholds.
            </p>
          </div>
        </div>

        {/* Results Summary Box if triggered */}
        {cleanupResult && (
          <div className="border-2 border-positive bg-surface p-5 animate-in fade-in space-y-4">
            <div className="flex items-center gap-2 text-positive font-bold text-xs uppercase tracking-wider border-b border-border/60 pb-3">
              <CheckCircle2 className="w-4 h-4" />
              <span>PURGE TELEMETRY & DATABASE VACUUM RESULTS</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-border bg-black p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase">
                  <Database className="w-3 h-3 text-accent" />
                  <span>EXPIRED SESSIONS PURGED</span>
                </div>
                <div className="text-xl font-bold text-foreground tabular-nums">
                  {formatFinancialNumber(cleanupResult.expiredSessionsDeleted)}
                </div>
              </div>

              <div className="border border-border bg-black p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase">
                  <KeyRound className="w-3 h-3 text-info" />
                  <span>INVALID TOKENS DELETED</span>
                </div>
                <div className="text-xl font-bold text-foreground tabular-nums">
                  {formatFinancialNumber(cleanupResult.expiredTokensDeleted)}
                </div>
              </div>

              <div className="border border-border bg-black p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase">
                  <ShieldCheck className="w-3 h-3 text-positive" />
                  <span>OLD ATTEMPTS CLEANED</span>
                </div>
                <div className="text-xl font-bold text-foreground tabular-nums">
                  {formatFinancialNumber(cleanupResult.oldLoginAttemptsDeleted)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Controls Card */}
        <div className="border border-border bg-surface p-5 space-y-6">
          <div className="flex items-center space-x-2 border-b border-border/60 pb-3">
            <Trash2 className="w-4 h-4 text-negative" />
            <h2 className="text-xs font-bold text-foreground tracking-wider uppercase">
              RETENTION THRESHOLD & EXECUTION
            </h2>
          </div>

          {/* Days Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="cleanup-days" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                PURGE RECORDS OLDER THAN (1 TO 180 DAYS)
              </label>
              <span className="text-xs font-bold text-accent tabular-nums bg-accent/10 border border-accent/30 px-2 py-0.5">
                {olderThanDaysValue} DAYS
              </span>
            </div>
            <input
              id="cleanup-days"
              type="range"
              min="1"
              max="180"
              step="1"
              {...register('olderThanDays', { valueAsNumber: true })}
              className="w-full accent-accent bg-border h-1.5 cursor-pointer"
            />
            {errors.olderThanDays && (
              <p className="text-[10px] text-negative">{errors.olderThanDays.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              All inactive database sessions, expired verification tokens, and login rate-limiting attempts created prior to {olderThanDaysValue} days ago will be permanently removed from PostgreSQL.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-negative">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Irreversible administrative action.</span>
            </div>

            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={cleanupMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider bg-negative/20 text-negative border border-negative hover:bg-negative hover:text-black transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>RUN EMERGENCY MAINTENANCE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Typed Confirmation Modal */}
      <DestructiveConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleRunCleanup}
        title="EXECUTE SYSTEM-WIDE RETENTION PURGE"
        description={`This will permanently delete all expired sessions, invalid tokens, and audit attempts older than ${olderThanDaysValue} days from the database.`}
        targetIdentifier="CLEANUP-CONFIRM"
        confirmButtonText="PURGE EXPIRED RECORDS NOW"
        isLoading={cleanupMutation.isPending}
      />
    </div>
  );
}
