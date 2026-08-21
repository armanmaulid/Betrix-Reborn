'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Download,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  Globe
} from 'lucide-react';
import { useAuditLogsQuery, downloadAuditLogsExport } from '@/lib/queries/use-audit-logs';
import { JsonTreeViewer } from '@/components/audit/json-tree-viewer';
import { useToast } from '@/components/ui/terminal-toast';
import { formatFinancialNumber } from '@/lib/utils';
import type { AuditLog } from '@/lib/types';
import Link from 'next/link';

export const AUDIT_ACTIONS = [
  { label: 'ALL ACTIONS', value: '' },
  { label: 'CREATE_USER', value: 'CREATE_USER' },
  { label: 'UPDATE_USER', value: 'UPDATE_USER' },
  { label: 'DELETE_USER', value: 'DELETE_USER' },
  { label: 'RESET_USER_PASSWORD', value: 'RESET_USER_PASSWORD' },
  { label: 'VIEW_USER_CHAT', value: 'VIEW_USER_CHAT' },
  { label: 'CREATE_VOUCHER', value: 'CREATE_VOUCHER' },
  { label: 'REVOKE_VOUCHER', value: 'REVOKE_VOUCHER' },
  { label: 'BATCH_REVOKE_VOUCHERS', value: 'BATCH_REVOKE_VOUCHERS' },
  { label: 'CREATE_AGENT', value: 'CREATE_AGENT' },
  { label: 'UPDATE_AGENT', value: 'UPDATE_AGENT' },
  { label: 'DELETE_AGENT', value: 'DELETE_AGENT' },
  { label: 'SET_DEFAULT_AGENT', value: 'SET_DEFAULT_AGENT' },
  { label: 'BROADCAST_MESSAGE', value: 'BROADCAST_MESSAGE' },
  { label: 'SYSTEM_CLEANUP', value: 'SYSTEM_CLEANUP' }
];

export default function AuditLogsPage() {
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

  const { data, isLoading, isError } = useAuditLogsQuery(queryParams);

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
              SECURITY & OPERATIONS AUDIT TRAIL
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable log of all administrator actions, credential changes, and system maintenance events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent text-foreground px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>EXPORT CSV</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent text-foreground px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-info" />
            <span>EXPORT JSON</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border border-border bg-black p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Filter className="w-3 h-3 text-accent" />
            <span>ACTION TYPE:</span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            {AUDIT_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          RECORD COUNT: <strong className="text-foreground tabular-nums">{formatFinancialNumber(total)}</strong> EVENTS
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-black/80 text-[10px] text-muted-foreground uppercase tracking-wider">
              <th className="p-3">TIMESTAMP (UTC)</th>
              <th className="p-3">ACTION EVENT</th>
              <th className="p-3">ACTOR ID</th>
              <th className="p-3">RESOURCE TARGET</th>
              <th className="p-3">IP / CLIENT</th>
              <th className="p-3 text-right">DETAILS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground animate-pulse">
                  STREAMING AUDIT LOGS FROM DATABASE...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-negative">
                  FAILED TO RETRIEVE AUDIT LOG ENTRIES.
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  NO AUDIT LOG EVENTS RECORDED MATCHING THE CURRENT FILTERS.
                </td>
              </tr>
            ) : (
              logs.map((log: AuditLog) => {
                const actionBadge =
                  log.action.includes('DELETE') || log.action.includes('REVOKE')
                    ? 'border-negative/40 bg-negative/10 text-negative'
                    : log.action.includes('CREATE') || log.action.includes('RESET')
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-info/40 bg-info/10 text-info';

                return (
                  <tr key={log.id} className="hover:bg-surface-hover/80 transition-colors">
                    {/* Timestamp */}
                    <td className="p-3 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                      {log.createdAt
                        ? new Date(log.createdAt).toISOString().substring(0, 19).replace('T', ' ')
                        : 'N/A'}
                    </td>

                    {/* Action */}
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold border uppercase ${actionBadge}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="p-3">
                      {log.userId ? (
                        <Link
                          href={`/users/${log.userId}`}
                          className="text-foreground hover:text-accent flex items-center gap-1 group text-[11px]"
                        >
                          <User className="w-3 h-3 text-muted-foreground group-hover:text-accent" />
                          <span className="truncate max-w-[100px] select-all">{log.userId}</span>
                        </Link>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60">SYSTEM_CRON</span>
                      )}
                    </td>

                    {/* Resource Target */}
                    <td className="p-3 text-xs">
                      <div className="text-foreground font-bold">{log.resource}</div>
                      {log.resourceId && (
                        <div className="text-[10px] text-muted-foreground select-all font-mono truncate max-w-[140px]">
                          ID: {log.resourceId}
                        </div>
                      )}
                    </td>

                    {/* IP Address */}
                    <td className="p-3 text-[11px]">
                      <div className="flex items-center gap-1.5 text-foreground font-bold">
                        <Globe className="w-3 h-3 text-muted-foreground" />
                        <span>{log.ipAddress || '127.0.0.1'}</span>
                      </div>
                      {log.userAgent && (
                        <div className="text-[9px] text-muted-foreground truncate max-w-[130px]" title={log.userAgent}>
                          {log.userAgent}
                        </div>
                      )}
                    </td>

                    {/* Details Inspection */}
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setInspectedLog(log)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>INSPECT</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="border border-border bg-black p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>ROWS PER PAGE:</span>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="bg-surface border border-border px-2 py-0.5 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            PAGE <strong className="text-foreground">{page}</strong> OF <strong className="text-foreground">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1 border border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1 border border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* JSON Tree Viewer Modal */}
      <JsonTreeViewer
        isOpen={Boolean(inspectedLog)}
        onClose={() => setInspectedLog(null)}
        title={inspectedLog?.action || 'AUDIT_LOG'}
        data={inspectedLog?.details as any}
      />
    </div>
  );
}
