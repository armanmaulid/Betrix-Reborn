'use client';

import React from 'react';
import { Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { MarketInstrument } from '@market/domain/entities/MarketInstrument';

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
    <div className="border border-border bg-surface overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-black/80 text-[10px] text-muted-foreground uppercase tracking-wider">
            <th className="p-3">SYMBOL / NAME</th>
            <th className="p-3">CATEGORY</th>
            <th className="p-3">FINNHUB TICKER</th>
            <th className="p-3">DUKASCOPY TICKER</th>
            <th className="p-3 text-right">DIGITS</th>
            <th className="p-3 text-right">PIP SIZE</th>
            <th className="p-3">STATUS</th>
            <th className="p-3 text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-muted-foreground animate-pulse">
                RETRIEVING MASTER INSTRUMENT CATALOG...
              </td>
            </tr>
          ) : isError ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-negative">
                ERROR LOADING INSTRUMENTS CATALOG.
              </td>
            </tr>
          ) : instruments.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-muted-foreground">
                NO INSTRUMENTS MATCH CRITERIA.
              </td>
            </tr>
          ) : (
            instruments.map((item) => (
              <tr key={item.symbol} className="hover:bg-surface-hover/80 transition-colors">
                <td className="p-3">
                  <div className="font-bold text-accent select-all">{item.symbol}</div>
                  <div className="text-[10px] text-muted-foreground">{item.name}</div>
                  {item.description && (
                    <div className="text-[9px] text-muted-foreground/60">{item.description}</div>
                  )}
                </td>
                <td className="p-3 uppercase text-muted-foreground">{item.category}</td>
                <td className="p-3 font-mono text-foreground select-all">
                  {item.finnhubSymbol || '--'}
                </td>
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
