'use client';

import React from 'react';
import { Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { MarketInstrument } from '@market/domain/entities/MarketInstrument';
import { TableShell, type TableColumn } from '@/shared/presentation/ui/table-shell';

const COLUMNS: TableColumn[] = [
  { key: 'symbol', label: 'Symbol / Name' },
  { key: 'category', label: 'Category' },
  { key: 'finnhub', label: 'Finnhub Ticker' },
  { key: 'dukascopy', label: 'Dukascopy Ticker' },
  { key: 'digits', label: 'Digits', align: 'right' },
  { key: 'pip', label: 'Pip Size', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' }
];

export interface MarketCatalogTableProps {
  instruments: MarketInstrument[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (instrument: MarketInstrument) => void;
  onDelete: (symbol: string) => void;
}

export function MarketCatalogTable({
  instruments,
  isLoading,
  isError,
  onEdit,
  onDelete
}: MarketCatalogTableProps) {
  return (
    <TableShell
      columns={COLUMNS}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && !isError && instruments.length === 0}
      loadingMessage="RETRIEVING MASTER INSTRUMENT CATALOG..."
      errorMessage="ERROR LOADING INSTRUMENTS CATALOG."
      emptyMessage="NO INSTRUMENTS MATCH CRITERIA."
    >
      {instruments.map((item) => (
        <tr key={item.symbol} className="hover:bg-surface-hover/80 transition-colors">
          <td className="p-3">
            <div className="font-bold text-accent select-all">{item.symbol}</div>
            <div className="text-[10px] text-muted-foreground">{item.name}</div>
            {item.description && (
              <div className="text-[9px] text-muted-foreground/60">{item.description}</div>
            )}
          </td>
          <td className="p-3 uppercase text-muted-foreground">{item.category}</td>
          <td className="p-3 font-mono text-foreground select-all">{item.finnhubSymbol || '--'}</td>
          <td className="p-3 font-mono text-muted-foreground select-all">
            {item.dukascopySymbol || '--'}
          </td>
          <td className="p-3 text-right tabular-nums text-foreground">{item.digits}</td>
          <td className="p-3 text-right tabular-nums text-foreground">{item.pipSize}</td>
          <td className="p-3">
            {item.isActive ? (
              <span className="flex items-center gap-1 text-[10px] text-positive font-bold">
                <CheckCircle className="w-3 h-3" /> ACTIVE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <XCircle className="w-3 h-3" /> INACTIVE
              </span>
            )}
          </td>
          <td className="p-3 text-right">
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => onEdit(item)}
                className="p-1 border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors cursor-pointer"
                title="Edit Master Instrument"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDelete(item.symbol)}
                className="p-1 border border-border bg-black hover:border-negative hover:text-negative text-muted-foreground transition-colors cursor-pointer"
                title="Delete Instrument from Catalog"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </TableShell>
  );
}
