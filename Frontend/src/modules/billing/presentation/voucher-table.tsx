'use client';

import React from 'react';
import Link from 'next/link';
import { Copy, Check, Trash2, ExternalLink } from 'lucide-react';
import type { CreditVoucher } from '@billing/domain/entities/CreditVoucher';
import { formatFinancialNumber } from '@/shared/utils';
import { formatDate, formatDateTime } from '@/shared/utils/formatters';
import { StatusBadge } from '@/shared/presentation/ui/status-badge';

export interface VoucherTableProps {
  vouchers: CreditVoucher[];
  isLoading: boolean;
  isError: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  onCopyCode: (code: string) => void;
  isCopied: (code: string) => boolean;
  onSelectForRevoke: (voucher: CreditVoucher) => void;
}

export function VoucherTable({
  vouchers,
  isLoading,
  isError,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  onCopyCode,
  isCopied,
  onSelectForRevoke
}: VoucherTableProps) {
  return (
    <div className="border border-border bg-surface overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-black/80 text-[10px] text-muted-foreground uppercase tracking-wider">
            <th className="p-3 w-8">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={onToggleSelectAll}
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
            vouchers.map((v: CreditVoucher) => (
              <tr
                key={v.id}
                className={`transition-colors ${selectedIds.has(v.id) ? 'bg-accent/5' : 'hover:bg-surface-hover/80'}`}
              >
                {/* Selection */}
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(v.id)}
                    onChange={() => onToggleSelect(v.id)}
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
                      onClick={() => onCopyCode(v.code)}
                      title="Copy Code to Clipboard"
                      className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
                    >
                      {isCopied(v.code) ? (
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

                {/* Status: tone decided at the UI layer (StatusBadge) */}
                <td className="p-3">
                  <StatusBadge status={v.getStatus()} />
                </td>

                {/* Redeemed By */}
                <td className="p-3 text-xs">
                  {v.redeemedById ? (
                    <Link
                      href={`/users/${v.redeemedById}`}
                      className="text-foreground hover:text-accent flex items-center gap-1 group"
                    >
                      <span className="text-[11px] select-all truncate max-w-[120px]">
                        {v.redeemedById}
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
                    </Link>
                  ) : (
                    <span className="text-muted-foreground/60 italic text-[11px]">UNREDEEMED</span>
                  )}
                </td>

                {/* Expires At: Encapsulated isExpired() check */}
                <td className="p-3 text-[11px] tabular-nums">
                  {v.expiresAt ? (
                    <span
                      className={
                        v.isExpired() ? 'text-negative font-bold' : 'text-muted-foreground'
                      }
                    >
                      {formatDateTime(v.expiresAt)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">PERPETUAL</span>
                  )}
                </td>

                {/* Created At */}
                <td className="p-3 text-[11px] text-muted-foreground tabular-nums">
                  {formatDate(v.createdAt)}
                </td>

                {/* Actions */}
                <td className="p-3 text-right">
                  <button
                    onClick={() => onSelectForRevoke(v)}
                    title="Revoke and Purge Voucher"
                    className="p-1 border border-border bg-black hover:border-negative hover:text-negative text-muted-foreground transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
