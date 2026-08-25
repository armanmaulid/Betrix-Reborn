'use client';

import React, { useState } from 'react';
import { ShieldAlert, Download, Filter, RefreshCw } from 'lucide-react';
import {
  useAuditLogsQuery,
  downloadAuditLogsExport
} from '@/modules/operations/application/queries/use-audit-logs';
import { AuditTable } from './audit-table';
import { JsonTreeViewer } from './json-tree-viewer';
import { PaginationBar } from '@/shared/presentation/ui/pagination-bar';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { formatFinancialNumber } from '@/shared/utils';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import { AUDIT_ACTIONS } from '@/shared/utils/constants';
import type { AuditLog } from '@operations/domain/entities/AuditLog';

export function AuditLogsContainer() {
  usePageTitle('SECURITY AUDIT LOGS');
  const { success, error } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [actionFilter, setActionFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Selected Log for inspection
  const [inspectedLog, setInspectedLog] = useState<AuditLog | null>(null);

  const queryParams = {
    page,
    limit,
    action: actionFilter || undefined,
    actionType: actionFilter || undefined
  };

  const { data, isLoading, isError, isRefetching, refetch } = useAuditLogsQuery(queryParams);

  const logs = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      await downloadAuditLogsExport({
        format,
        action: actionFilter || undefined,
        actionType: actionFilter || undefined
      });
      success('EXPORT GENERATED', `Audit log dataset exported as ${format.toUpperCase()}.`);
    } catch (err: any) {
      error('EXPORT FAILED', err.message || 'Unable to generate export.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Header Bar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              SECURITY AUDIT LOGS & TRACEABILITY
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable operational audit trail, privileged events, and actor telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT JSON</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border border-border bg-black p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Filter className="w-3 h-3 text-accent" />
            <span>ACTION TYPE:</span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            {AUDIT_ACTIONS.map((action) => (
              <option key={action.value || 'all'} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          TOTAL:{' '}
          <strong className="text-foreground tabular-nums">{formatFinancialNumber(total)}</strong>{' '}
          LOGGED EVENTS
        </div>
      </div>

      {/* Audit Log Table Pure View */}
      <AuditTable
        logs={logs}
        isLoading={isLoading}
        isError={isError}
        onInspect={(log) => setInspectedLog(log)}
      />

      {/* Pagination Bar */}
      <PaginationBar
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        limitOptions={[25, 50, 100, 200]}
        isLoading={isLoading}
      />

      {/* JSON Payload Inspection Drawer/Modal */}
      {inspectedLog && (
        <JsonTreeViewer
          isOpen={Boolean(inspectedLog)}
          onClose={() => setInspectedLog(null)}
          title={`EVENT PAYLOAD: ${inspectedLog.action}`}
          data={{
            id: inspectedLog.id,
            action: inspectedLog.action,
            userId: inspectedLog.userId,
            resource: inspectedLog.resource,
            resourceId: inspectedLog.resourceId,
            ipAddress: inspectedLog.ipAddress,
            userAgent: inspectedLog.userAgent,
            createdAt: inspectedLog.createdAt,
            details: inspectedLog.details
          }}
        />
      )}
    </div>
  );
}
