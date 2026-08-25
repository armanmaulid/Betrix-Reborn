'use client';

import React from 'react';
import { Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { OhlcSymbolEntity } from '@market/domain/entities/MarketInstrument';

export interface OhlcSymbolTableProps {
  symbols: OhlcSymbolEntity[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (symbol: OhlcSymbolEntity) => void;
  onDelete: (symbolName: string) => void;
}

export function OhlcSymbolTable({
  symbols,
  isLoading,
  isError,
  onEdit,
  onDelete
}: OhlcSymbolTableProps) {
  return (
    <div className="border border-border bg-surface overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-black/80 text-[10px] text-muted-foreground uppercase tracking-wider">
            <th className="p-3">SYMBOL</th>
            <th className="p-3">DUKASCOPY FEED</th>
            <th className="p-3">CATEGORY</th>
            <th className="p-3">DESCRIPTION</th>
            <th className="p-3">STATUS</th>
            <th className="p-3 text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {isLoading ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-muted-foreground animate-pulse">
                RETRIEVING OHLC SYMBOLS...
              </td>
            </tr>
          ) : isError ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-negative">
                ERROR LOADING OHLC SYMBOLS.
              </td>
            </tr>
          ) : symbols.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-muted-foreground">
                NO OHLC SYMBOLS CONFIGURED.
              </td>
            </tr>
          ) : (
            symbols.map((item) => (
              <tr key={item.symbol} className="hover:bg-surface-hover/80 transition-colors">
                <td className="p-3 font-bold text-accent select-all">{item.symbol}</td>
                <td className="p-3 font-mono text-foreground select-all">{item.dukascopySymbol}</td>
                <td className="p-3 uppercase text-muted-foreground">{item.category}</td>
                <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                  {item.description || '—'}
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
                      title="Edit OHLC Symbol"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDelete(item.symbol)}
                      className="p-1 border border-border bg-black hover:border-negative hover:text-negative text-muted-foreground transition-colors cursor-pointer"
                      title="Delete OHLC Symbol"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
