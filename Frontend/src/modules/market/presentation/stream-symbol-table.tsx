'use client';

import React from 'react';
import { Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { StreamSymbolEntity } from '@/modules/market/domain/entities/MarketInstrument';
import type { PriceTick } from '@/modules/market/domain/value-objects/PriceTick';
import { TableShell, type TableColumn } from '@/shared/presentation/ui/table-shell';

const COLUMNS: TableColumn[] = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'feed', label: 'Finnhub Feed' },
  { key: 'category', label: 'Category' },
  { key: 'lastPrice', label: 'Last Price', align: 'right' },
  { key: 'bidAsk', label: 'Bid / Ask', align: 'right' },
  { key: 'change', label: '24h Change', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' }
];

export interface StreamSymbolTableProps {
  symbols: StreamSymbolEntity[];
  priceMap: Map<string, PriceTick>;
  isLoading: boolean;
  isError: boolean;
  onEdit: (symbol: StreamSymbolEntity) => void;
  onDelete: (symbolName: string) => void;
}

export function StreamSymbolTable({
  symbols,
  priceMap,
  isLoading,
  isError,
  onEdit,
  onDelete
}: StreamSymbolTableProps) {
  return (
    <TableShell
      columns={COLUMNS}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && !isError && symbols.length === 0}
      loadingMessage="RETRIEVING STREAM SYMBOLS..."
      errorMessage="ERROR LOADING STREAM SYMBOLS."
      emptyMessage="NO STREAM SYMBOLS CONFIGURED."
    >
      {symbols.map((item) => {
        const tick = priceMap.get(item.symbol);
        const change = tick?.change24hPercent ?? 0;
        const isPositive = change >= 0;

        return (
          <tr key={item.symbol} className="hover:bg-surface-hover/80 transition-colors">
            <td className="p-3 font-bold text-accent select-all">
              {item.symbol}
              {item.description && (
                <div className="text-[10px] text-muted-foreground font-normal">
                  {item.description}
                </div>
              )}
            </td>
            <td className="p-3 font-mono text-foreground select-all">{item.finnhubSymbol}</td>
            <td className="p-3 uppercase text-muted-foreground">{item.category}</td>
            <td className="p-3 text-right font-bold text-foreground tabular-nums">
              {tick ? tick.formatPrice(item.category) : '--'}
            </td>
            <td className="p-3 text-right text-muted-foreground tabular-nums">
              {tick ? `${tick.bid.toFixed(2)} / ${tick.ask.toFixed(2)}` : '--'}
            </td>
            <td
              className={`p-3 text-right font-bold tabular-nums ${isPositive ? 'text-positive' : 'text-negative'}`}
            >
              {tick ? `${isPositive ? '+' : ''}${change.toFixed(2)}%` : '--'}
            </td>
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
                  title="Edit Stream Symbol"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onDelete(item.symbol)}
                  className="p-1 border border-border bg-black hover:border-negative hover:text-negative text-muted-foreground transition-colors cursor-pointer"
                  title="Delete Stream Symbol"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </td>
          </tr>
        );
      })}
    </TableShell>
  );
}
