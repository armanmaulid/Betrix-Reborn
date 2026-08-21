'use client';

import React, { useState } from 'react';
import {
  Ticket,
  PlusCircle,
  Copy,
  Check,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowUpDown
} from 'lucide-react';
import { useVouchersQuery, useRevokeVoucherMutation, useBatchRevokeVouchersMutation } from '@/lib/queries/use-vouchers';
import { CreateVoucherDialog } from '@/components/vouchers/create-voucher-dialog';
import { DestructiveConfirmDialog } from '@/components/ui/destructive-confirm-dialog';
import { useToast } from '@/components/ui/terminal-toast';
import { formatFinancialNumber } from '@/lib/utils';
import type { CreditVoucher } from '@/lib/types';
import Link from 'next/link';

export default function VouchersPage() {
  const { success, error } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'redeemed'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'amount' | 'redeemedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchRevokeOpen, setIsBatchRevokeOpen] = useState(false);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedVoucherForRevoke, setSelectedVoucherForRevoke] = useState<CreditVoucher | null>(null);

  const revokeMutation = useRevokeVoucherMutation();
  const batchRevokeMutation = useBatchRevokeVouchersMutation();

  const queryParams = {
    page,
    limit,
    isRedeemed: statusFilter === 'redeemed' ? true : statusFilter === 'active' ? false : undefined,
    sortBy,
    sortOrder
  };

  const { data, isLoading, isError, refetch } = useVouchersQuery(queryParams);

  const vouchers = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

  const allVisibleSelected = vouchers.length > 0 && vouchers.every((v: CreditVoucher) => selectedIds.has(v.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (vouchers.every((v: CreditVoucher) => prev.has(v.id))) {
        return new Set();
      }
      const next = new Set(prev);
      for (const v of vouchers) next.add(v.id);
      return next;
    });
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      success('CODE COPIED', `Voucher ${code} copied to clipboard.`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {}
  };

  const handleRevokeConfirm = async () => {
    if (!selectedVoucherForRevoke) return;
    try {
      await revokeMutation.mutateAsync(selectedVoucherForRevoke.id);
      success('VOUCHER REVOKED', `Voucher ${selectedVoucherForRevoke.code} permanently deleted.`);
      setSelectedVoucherForRevoke(null);
    } catch (err: any) {
      error('REVOCATION FAILED', err.message || 'Unable to revoke voucher.');
    }
  };

  const handleBatchRevokeConfirm = async () => {
    try {
      const res = await batchRevokeMutation.mutateAsync(Array.from(selectedIds));
      const { revoked, failed } = res.data || {};
      success(
        'BATCH REVOKE COMPLETE',
        `${revoked} voucher${revoked === 1 ? '' : 's'} revoked${failed?.length ? `, ${failed.length} failed` : ''}.`
      );
      setSelectedIds(new Set());
      setIsBatchRevokeOpen(false);
    } catch (err: any) {
      error('BATCH REVOKE FAILED', err.message || 'Unable to batch revoke vouchers.');
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Header Bar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Ticket className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              PROMOTIONAL CREDIT VOUCHERS
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Issue token vouchers, monitor redemptions, and revoke promotional codes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>GENERATE VOUCHER</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border border-border bg-black p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Filter className="w-3 h-3 text-accent" />
            <span>REDEMPTION STATUS:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); setSelectedIds(new Set()); }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="all">ALL VOUCHERS</option>
            <option value="active">AVAILABLE ONLY (Unredeemed)</option>
            <option value="redeemed">REDEEMED ONLY</option>
          </select>

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-2">
            <ArrowUpDown className="w-3 h-3 text-accent" />
            <span>SORT:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="createdAt">CREATED AT</option>
            <option value="amount">CREDIT VALUE</option>
            <option value="redeemedAt">REDEEMED AT</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value as any); setPage(1); }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="desc">DESC</option>
            <option value="asc">ASC</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          TOTAL: <strong className="text-foreground tabular-nums">{formatFinancialNumber(total)}</strong> VOUCHERS
        </div>
      </div>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="border border-negative/40 bg-negative/10 p-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-foreground font-bold tracking-wider">
            {selectedIds.size} VOUCHER{selectedIds.size === 1 ? '' : 'S'} SELECTED
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="border border-border bg-black hover:bg-surface-hover text-muted-foreground hover:text-foreground px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              CLEAR SELECTION
            </button>
            <button
              onClick={() => setIsBatchRevokeOpen(true)}
              className="flex items-center gap-1.5 border border-negative/60 bg-negative/20 hover:bg-negative hover:text-white text-negative px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              REVOKE SELECTED ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Vouchers Table */}
      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-black/80 text-[10px] text-muted-foreground uppercase tracking-wider">
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  disabled={vouchers.length === 0}
                  title="Select all vouchers on this page"
                  className="accent-accent cursor-pointer"
                />
              </th>
              <th className="p-3">VOUCHER CODE</th>
              <th className="p-3 text-right">CREDIT VALUE</th>
              <th className="p-3">STATUS</th>
              <th className="p-3">REDEEMED BY</th>
              <th className="p-3">EXPIRES AT</th>
              <th className="p-3">CREATED AT</th>
              <th className="p-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground animate-pulse">
                  FETCHING VOUCHER INVENTORY...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-negative">
                  ERROR LOADING VOUCHERS. PLEASE RETRY.
                </td>
              </tr>
            ) : vouchers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  NO VOUCHERS MATCH THE SELECTED FILTER CRITERIA.
                </td>
              </tr>
            ) : (
              vouchers.map((v: CreditVoucher) => {
                const isExpired = v.expiresAt ? new Date(v.expiresAt) < new Date() : false;

                return (
                  <tr key={v.id} className={`transition-colors ${selectedIds.has(v.id) ? 'bg-accent/5' : 'hover:bg-surface-hover/80'}`}>
                    {/* Selection */}
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(v.id)}
                        onChange={() => toggleSelect(v.id)}
                        className="accent-accent cursor-pointer"
                      />
                    </td>

                    {/* Code */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-accent select-all tracking-wider font-mono">
                          {v.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(v.code)}
                          title="Copy Code to Clipboard"
                          className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
                        >
                          {copiedCode === v.code ? (
                            <Check className="w-3 h-3 text-positive" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 select-all">{v.id}</div>
                    </td>

                    {/* Credit Value */}
                    <td className="p-3 text-right font-bold text-foreground tabular-nums">
                      {formatFinancialNumber(v.amount)} CREDITS
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      {v.isRedeemed ? (
                        <span className="px-2 py-0.5 text-[9px] font-bold border border-border bg-black text-muted-foreground uppercase">
                          REDEEMED
                        </span>
                      ) : isExpired ? (
                        <span className="px-2 py-0.5 text-[9px] font-bold border border-negative/40 bg-negative/10 text-negative uppercase">
                          EXPIRED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold border border-positive/40 bg-positive/10 text-positive uppercase">
                          AVAILABLE
                        </span>
                      )}
                    </td>

                    {/* Redeemed By */}
                    <td className="p-3 text-xs">
                      {v.redeemedById ? (
                        <Link
                          href={`/users/${v.redeemedById}`}
                          className="text-foreground hover:text-accent flex items-center gap-1 group"
                        >
                          <span className="text-[11px] select-all truncate max-w-[120px]">{v.redeemedById}</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground/60 italic text-[11px]">UNREDEEMED</span>
                      )}
                    </td>

                    {/* Expires At */}
                    <td className="p-3 text-[11px] tabular-nums">
                      {v.expiresAt ? (
                        <span className={isExpired ? 'text-negative font-bold' : 'text-muted-foreground'}>
                          {new Date(v.expiresAt).toISOString().substring(0, 19).replace('T', ' ')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">PERPETUAL</span>
                      )}
                    </td>

                    {/* Created At */}
                    <td className="p-3 text-[11px] text-muted-foreground tabular-nums">
                      {v.createdAt ? new Date(v.createdAt).toISOString().substring(0, 10) : 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedVoucherForRevoke(v)}
                        title="Revoke and Purge Voucher"
                        className="p-1 border border-border bg-black hover:border-negative hover:text-negative text-muted-foreground transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
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
            <option value={10}>10</option>
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

      {/* Create Voucher Dialog */}
      <CreateVoucherDialog
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); refetch(); }}
      />

      {/* Revoke Voucher Confirmation */}
      <DestructiveConfirmDialog
        isOpen={Boolean(selectedVoucherForRevoke)}
        onClose={() => setSelectedVoucherForRevoke(null)}
        onConfirm={handleRevokeConfirm}
        title="PERMANENTLY REVOKE VOUCHER"
        description={`Revoking will delete the promotional code "${selectedVoucherForRevoke?.code}" with value of ${selectedVoucherForRevoke?.amount} credits immediately.`}
        targetIdentifier={selectedVoucherForRevoke?.code}
        confirmButtonText="REVOKE CODE NOW"
        isLoading={revokeMutation.isPending}
      />

      {/* Batch Revoke Confirmation */}
      <DestructiveConfirmDialog
        isOpen={isBatchRevokeOpen}
        onClose={() => setIsBatchRevokeOpen(false)}
        onConfirm={handleBatchRevokeConfirm}
        title="PERMANENTLY REVOKE SELECTED VOUCHERS"
        description={`This will permanently delete ${selectedIds.size} voucher${selectedIds.size === 1 ? '' : 's'} immediately. This action cannot be undone.`}
        targetIdentifier={`${selectedIds.size} SELECTED VOUCHERS`}
        confirmButtonText={`REVOKE ${selectedIds.size} CODES NOW`}
        isLoading={batchRevokeMutation.isPending}
      />
    </div>
  );
}
