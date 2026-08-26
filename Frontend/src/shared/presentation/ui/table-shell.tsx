'use client';

import React from 'react';

export type ColumnAlign = 'left' | 'right' | 'center';

export interface TableColumn {
  key: string;
  /** Rendered UPPERCASE-styled automatically — pass normal words. */
  label?: string;
  /** Full custom header node (e.g. a select-all checkbox) — wins over label. */
  header?: React.ReactNode;
  align?: ColumnAlign;
}

export interface TableShellProps {
  columns: TableColumn[];
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  loadingMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
  /**
   * Row content (<tr> fragments / fragments containing them) rendered inside
   * <tbody> whenever none of the state flags is active. Custom divider rows
   * (e.g. day group headers) belong here too.
   */
  children?: React.ReactNode;
  stickyHeader?: boolean;
  wrapperClassName?: string;
  /** Escape hatch for pages that scroll programmatically (e.g. calendar). */
  wrapperRef?: React.Ref<HTMLDivElement>;
}

const ALIGN_CLASS: Record<ColumnAlign, string> = {
  left: '',
  right: 'text-right',
  center: 'text-center'
};

function StateRow({
  colSpan,
  message,
  pulse,
  negative
}: {
  colSpan: number;
  message: string;
  pulse?: boolean;
  negative?: boolean;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={`p-8 text-center ${pulse ? 'animate-pulse ' : ''}${
          negative ? 'text-negative' : 'text-muted-foreground'
        }`}
      >
        {message}
      </td>
    </tr>
  );
}

/**
 * House table shell: wrapper card, collapsed table, black/80 UPPERCASE header
 * with p-3 cells, divide-y body, and colSpan state rows for loading/error/
 * empty — the exact language every table in the app shares (style-audited).
 */
export function TableShell({
  columns,
  isLoading = false,
  isError = false,
  isEmpty = false,
  loadingMessage = 'FETCHING DATA...',
  errorMessage = 'ERROR LOADING DATA. PLEASE RETRY.',
  emptyMessage = 'NO DATA MATCHES THE SELECTED FILTERS.',
  children,
  stickyHeader = false,
  wrapperClassName = '',
  wrapperRef
}: TableShellProps) {
  const colSpan = Math.max(1, columns.length);

  return (
    <div
      ref={wrapperRef}
      className={`border border-border bg-surface overflow-x-auto ${wrapperClassName}`}
    >
      <table className="w-full text-left text-xs border-collapse">
        <thead className={stickyHeader ? 'sticky top-0 z-10' : undefined}>
          <tr className="border-b border-border bg-black/80 text-[10px] uppercase tracking-wider text-muted-foreground">
            {columns.map((column) => (
              <th key={column.key} className={`p-3 ${ALIGN_CLASS[column.align ?? 'left']}`}>
                {column.header ?? column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {isLoading ? (
            <StateRow colSpan={colSpan} message={loadingMessage} pulse />
          ) : isError ? (
            <StateRow colSpan={colSpan} message={errorMessage} negative />
          ) : isEmpty ? (
            <StateRow colSpan={colSpan} message={emptyMessage} />
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
