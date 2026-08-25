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
  RefreshCw,
  Cpu
} from 'lucide-react';
import { z } from 'zod';
import {
  SystemCleanupSchema,
  type SystemCleanupInput
} from '@/modules/operations/application/schemas/admin.schema';
import {
  useCleanupMutation,
  type CleanupResult
} from '@/modules/operations/application/queries/use-maintenance';
import {
  useWorkersQuery,
  useControlWorkerMutation
} from '@/modules/operations/application/queries/use-workers';
import { WorkerDaemonCard } from './worker-daemon-card';
import { DestructiveConfirmDialog } from '@/shared/presentation/ui/destructive-confirm-dialog';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { formatFinancialNumber } from '@/shared/utils';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import type { WorkerAction } from '@operations/domain/entities/BackgroundWorker';

export function MaintenanceContainer() {
  usePageTitle('FLEET MAINTENANCE');
  const { success, error } = useToast();
  const cleanupMutation = useCleanupMutation();
  const controlWorkerMutation = useControlWorkerMutation();

  const {
    data: workers = [],
    isLoading: isWorkersLoading,
    isError: isWorkersError,
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
      error('CLEANUP FAILED', err.message || 'Unable to execute cleanup routine.');
    }
  };

  const handleControlWorker = async (workerId: string, action: WorkerAction) => {
    try {
      await controlWorkerMutation.mutateAsync({ id: workerId, action });
      success(
        'DAEMON ACTION SENT',
        `Worker ${workerId} command "${action.toUpperCase()}" acknowledged.`
      );
    } catch (err: any) {
      error('CONTROL ERROR', err.message || `Failed to ${action} worker daemon.`);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header Bar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              FLEET MAINTENANCE & SYSTEM HYGIENE
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Purge expired sessions, clean temporary telemetry artifacts, and control daemon workers
          </p>
        </div>

        <button
          onClick={() => refetchWorkers()}
          disabled={isWorkersLoading || isWorkersRefetching}
          className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh Background Daemons"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isWorkersRefetching ? 'animate-spin' : ''}`} />
          <span>REFRESH DAEMONS</span>
        </button>
      </div>

      {/* Background Daemons Grid */}
      <div className="border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-accent uppercase tracking-wider">
              OPERATIONAL DAEMON THREADS
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {workers.filter((w) => w.isRunning()).length} / {workers.length} ACTIVE
          </div>
        </div>

        {isWorkersLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
            DISCOVERING BACKGROUND DAEMON PROCESSES...
          </div>
        ) : isWorkersError ? (
          <div className="p-6 text-center text-xs text-negative border border-negative bg-black">
            ERROR FETCHING BACKGROUND DAEMON REGISTRY.
          </div>
        ) : workers.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border/80">
            NO REGISTERED BACKGROUND DAEMON WORKERS FOUND.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.map((worker) => (
              <WorkerDaemonCard
                key={worker.id}
                worker={worker}
                onControl={handleControlWorker}
                isControlling={controlWorkerMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Manual Retention & Vacuum Cleaning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <form
            onSubmit={handleSubmit(() => setIsConfirmOpen(true))}
            className="border border-border bg-surface p-5 space-y-4"
          >
            <div className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border pb-2">
              DATABASE VACUUM & RETENTION POLICY
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-border/80 bg-black/60 p-3 space-y-1">
                <div className="text-muted-foreground text-[10px] uppercase font-bold flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-accent" />
                  <span>EXPIRED SESSIONS</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Purges invalidated session tokens
                </div>
              </div>

              <div className="border border-border/80 bg-black/60 p-3 space-y-1">
                <div className="text-muted-foreground text-[10px] uppercase font-bold flex items-center gap-1">
                  <Database className="w-3 h-3 text-accent" />
                  <span>DATABASE PURGE</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Reclaims unindexed table storage
                </div>
              </div>

              <div className="border border-border/80 bg-black/60 p-3 space-y-1">
                <div className="text-muted-foreground text-[10px] uppercase font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-accent" />
                  <span>LOGIN ATTEMPTS</span>
                </div>
                <div className="text-xs text-muted-foreground">Clears rate limiter telemetry</div>
              </div>
            </div>

            {/* Retention Age Input */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                RECORD RETENTION THRESHOLD (DAYS) *
              </label>
              <input
                type="number"
                min={1}
                max={365}
                {...register('olderThanDays', { valueAsNumber: true })}
                className={`w-full bg-black border p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none ${
                  errors.olderThanDays ? 'border-negative' : 'border-border focus:border-accent'
                }`}
              />
              {errors.olderThanDays && (
                <div className="text-[10px] text-negative flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.olderThanDays.message}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3 text-accent shrink-0" />
                <span>Runs non-blocking Postgres vacuum analyze & row deletion</span>
              </div>

              <button
                type="submit"
                disabled={cleanupMutation.isPending}
                className="flex items-center gap-1.5 border border-negative/60 bg-negative/20 hover:bg-negative hover:text-white text-negative px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{cleanupMutation.isPending ? 'CLEANING UP...' : 'EXECUTE VACUUM PURGE'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Result Summary */}
        <div className="space-y-4">
          <div className="border border-border bg-surface p-5 space-y-4">
            <div className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border pb-2">
              LAST PURGE RESULTS
            </div>

            {cleanupResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-positive text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>VACUUM EXECUTED SUCCESSFULLY</span>
                </div>

                <div className="border border-border bg-black p-3 space-y-2 text-xs divide-y divide-border/60">
                  <div className="flex items-center justify-between pb-1.5">
                    <span className="text-muted-foreground text-[10px]">EXPIRED SESSIONS:</span>
                    <strong className="text-foreground tabular-nums">
                      {formatFinancialNumber(cleanupResult.expiredSessionsDeleted)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground text-[10px]">EXPIRED TOKENS:</span>
                    <strong className="text-foreground tabular-nums">
                      {formatFinancialNumber(cleanupResult.expiredTokensDeleted)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between pt-1.5">
                    <span className="text-muted-foreground text-[10px]">OLD LOGIN ATTEMPTS:</span>
                    <strong className="text-foreground tabular-nums">
                      {formatFinancialNumber(cleanupResult.oldLoginAttemptsDeleted)}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border/80">
                NO VACUUM PURGE EXECUTED IN CURRENT SESSION.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <DestructiveConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleRunCleanup}
        title="EXECUTE SYSTEM VACUUM PURGE"
        description={`This will permanently delete all session logs, revoked tokens, and temporary login data older than ${olderThanDaysValue} days. Are you sure you want to proceed?`}
        targetIdentifier={`PURGE > ${olderThanDaysValue} DAYS`}
        confirmButtonText="RUN VACUUM PURGE"
        isLoading={cleanupMutation.isPending}
      />
    </div>
  );
}
