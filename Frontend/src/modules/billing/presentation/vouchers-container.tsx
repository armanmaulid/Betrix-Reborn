'use client';

import React, { useState } from 'react';
import { Ticket, PlusCircle, Trash2, Filter, ArrowUpDown, RefreshCw } from 'lucide-react';
import {
  useVouchersQuery,
  useRevokeVoucherMutation,
  useBatchRevokeVouchersMutation
} from '@/modules/billing/application/queries/use-vouchers';
import { VoucherTable } from './voucher-table';
import { PageHeader } from '@/shared/presentation/ui/page-header';
import { FilterBar } from '@/shared/presentation/ui/filter-bar';
import { CreateVoucherDialog } from './create-voucher-dialog';
import { DestructiveConfirmDialog } from '@/shared/presentation/ui/destructive-confirm-dialog';
import { PaginationBar } from '@/shared/presentation/ui/pagination-bar';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { formatFinancialNumber } from '@/shared/utils';
import { useCopyFeedback } from '@/shared/presentation/hooks/use-copy-feedback';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import type { CreditVoucher } from '@/modules/billing/domain/entities/CreditVoucher';

export function VouchersContainer() {
  usePageTitle('CREDIT VOUCHERS');
  const { success, error } = useToast();
  const { isCopied, copy: copyCode } = useCopyFeedback();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'redeemed'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'amount' | 'redeemedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchRevokeOpen, setIsBatchRevokeOpen] = useState(false);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedVoucherForRevoke, setSelectedVoucherForRevoke] = useState<CreditVoucher | null>(
    null
  );

  const revokeMutation = useRevokeVoucherMutation();
  const batchRevokeMutation = useBatchRevokeVouchersMutation();

  const queryParams = {
    page,
    limit,
    isRedeemed: statusFilter === 'redeemed' ? true : statusFilter === 'active' ? false : undefined,
    sortBy,
    sortOrder
  };

  const { data, isLoading, isError, isRefetching, refetch } = useVouchersQuery(queryParams);

  const vouchers = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

  const allVisibleSelected =
    vouchers.length > 0 && vouchers.every((v: CreditVoucher) => selectedIds.has(v.id));

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
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(vouchers.map((v: CreditVoucher) => v.id)));
    }
  };

  const handleCopyCode = (code: string) => {
    copyCode(code, code, {
      toastTitle: 'CODE COPIED',
      toastMessage: `Voucher ${code} copied to clipboard.`
    });
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
      const { revokedCount } = res || { revokedCount: selectedIds.size };
      success(
        'BATCH REVOKE COMPLETE',
        `${revokedCount} voucher${revokedCount === 1 ? '' : 's'} revoked.`
      );
      setSelectedIds(new Set());
      setIsBatchRevokeOpen(false);
    } catch (err: any) {
      error('BATCH REVOKE FAILED', err.message || 'Unable to batch revoke vouchers.');
    }
  };

  return (
    <div className="space-y-3 font-mono">
      <PageHeader
        title="PROMOTIONAL CREDIT VOUCHERS"
        icon={Ticket}
        subtitle="Issue token vouchers, monitor redemptions, and revoke promotional codes"
        actions={
          <>
            <button
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh Vouchers List"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              <span>REFRESH</span>
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>GENERATE VOUCHER</span>
            </button>
          </>
        }
      />

      {/* Filter Bar */}
      <FilterBar className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Filter className="w-3 h-3 text-accent" />
            <span>REDEMPTION STATUS:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
              setSelectedIds(new Set());
            }}
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
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setPage(1);
              setSelectedIds(new Set());
            }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="createdAt">CREATED AT</option>
            <option value="amount">CREDIT VALUE</option>
            <option value="redeemedAt">REDEEMED AT</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as any);
              setPage(1);
              setSelectedIds(new Set());
            }}
            className="bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="desc">DESC</option>
            <option value="asc">ASC</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          TOTAL:{' '}
          <strong className="text-foreground tabular-nums">{formatFinancialNumber(total)}</strong>{' '}
          VOUCHERS
        </div>
      </FilterBar>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="border border-negative/40 bg-negative/10 p-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-foreground font-bold tracking-wider">
            {selectedIds.size} VOUCHER{selectedIds.size === 1 ? '' : 'S'} SELECTED
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="border border-border bg-black hover:bg-surface-hover text-muted-foreground hover:text-foreground px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              CLEAR SELECTION
            </button>
            <button
              onClick={() => setIsBatchRevokeOpen(true)}
              className="flex items-center gap-1.5 border border-negative/60 bg-negative/20 hover:bg-negative hover:text-white text-negative px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              REVOKE SELECTED ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Vouchers Pure View Table */}
      <VoucherTable
        vouchers={vouchers}
        isLoading={isLoading}
        isError={isError}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        allVisibleSelected={allVisibleSelected}
        onCopyCode={handleCopyCode}
        isCopied={isCopied}
        onSelectForRevoke={(v) => setSelectedVoucherForRevoke(v)}
      />

      {/* Pagination */}
      <PaginationBar
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => {
          setPage(p);
          setSelectedIds(new Set());
        }}
        limit={limit}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
          setSelectedIds(new Set());
        }}
        limitOptions={[10, 25, 50, 100]}
        isLoading={isLoading}
      />

      {/* Create Voucher Dialog */}
      <CreateVoucherDialog
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          refetch();
        }}
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
