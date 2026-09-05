'use client';

import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatFinancialNumber } from '@/shared/utils/formatters';

export interface PaginationBarProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  limit?: number;
  onLimitChange?: (newLimit: number) => void;
  limitOptions?: number[];
  total?: number;
  totalLabel?: string;
  isLoading?: boolean;
  className?: string;
  hideIfSinglePage?: boolean;
}

export function PaginationBar({
  page,
  totalPages,
  onPageChange,
  limit,
  onLimitChange,
  limitOptions = [10, 25, 50, 100],
  total,
  totalLabel,
  isLoading = false,
  className = '',
  hideIfSinglePage = false
}: PaginationBarProps) {
  const effectiveTotalPages = Math.max(1, totalPages);

  // Self-heal when the current page falls out of range (e.g. the last row of
  // the last page was deleted and totalPages shrank after a refetch).
  useEffect(() => {
    if (!isLoading && page > effectiveTotalPages) {
      onPageChange(effectiveTotalPages);
    }
  }, [page, effectiveTotalPages, isLoading, onPageChange]);

  if (hideIfSinglePage && effectiveTotalPages <= 1) {
    return null;
  }

  return (
    <div
      className={`border border-border bg-black p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono select-none ${className}`}
    >
      {/* Left side: Rows per page or Total counts */}
      <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
        {limit !== undefined && onLimitChange && (
          <div className="flex items-center gap-2">
            <span>ROWS PER PAGE:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              disabled={isLoading}
              className="bg-surface border border-border px-2 py-0.5 pointer-coarse:min-h-11 text-xs text-foreground focus:outline-none focus:border-accent disabled:opacity-50"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {total !== undefined && (
          <div>
            {totalLabel ? `${totalLabel}: ` : 'TOTAL: '}
            <strong className="text-foreground">{formatFinancialNumber(total)}</strong>
          </div>
        )}
      </div>

      {/* Right side: Page navigation */}
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">
          PAGE <strong className="text-foreground">{Math.min(page, effectiveTotalPages)}</strong> OF{' '}
          <strong className="text-foreground">{effectiveTotalPages}</strong>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || isLoading}
            className="p-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11 border border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(effectiveTotalPages, page + 1))}
            disabled={page >= effectiveTotalPages || isLoading}
            className="p-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11 border border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
