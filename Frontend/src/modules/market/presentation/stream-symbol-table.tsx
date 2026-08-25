'use client';

import React from 'react';
import { Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { StreamSymbolEntity } from '@market/domain/entities/MarketInstrument';
import type { PriceTick } from '@market/domain/value-objects/PriceTick';

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
    <div className="border border-border bg-surface overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-black/80 text-[10px] text-muted-foreground uppercase tracking-wider">
            <th className="p-3">SYMBOL</th>
            <th className="p-3">FINNHUB FEED</th>
            <th className="p-3">CATEGORY</th>
            <th className="p-3 text-right">LAST PRICE</th>
            <th className="p-3 text-right">BID / ASK</th>
            <th className="p-3 text-right">24H CHANGE</th>
            <th className="p-3">STATUS</th>
            <th className="p-3 text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-muted-foreground animate-pulse">
                RETRIEVING STREAM SYMBOLS...
              </td>
            </tr>
          ) : isError ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-negative">
                ERROR LOADING STREAM SYMBOLS.
              </td>
            </tr>
          ) : symbols.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-muted-foreground">
                NO STREAM SYMBOLS CONFIGURED.
              </td>
            </tr>
          ) : (
            symbols.map((item) => {
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
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
