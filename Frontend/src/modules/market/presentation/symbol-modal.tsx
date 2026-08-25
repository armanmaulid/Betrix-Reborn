'use client';

import React, { useState, useEffect } from 'react';
import { Database, Activity } from 'lucide-react';
import { TerminalModal } from '@/shared/presentation/ui/terminal-modal';

export interface SymbolFormData {
  symbol: string;
  description: string;
  category: string;
  finnhubSymbol: string;
  dukascopySymbol?: string;
  isActive: boolean;
}

export interface SymbolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SymbolFormData) => void | Promise<void>;
  initialData?: Partial<SymbolFormData> | null;
  mode?: 'catalog' | 'stream' | 'ohlc';
  isPending?: boolean;
}

export const SYMBOL_CATEGORIES = [
  { value: 'forex', label: 'FOREX' },
  { value: 'metal', label: 'PRECIOUS METALS' },
  { value: 'energy', label: 'ENERGY' },
  { value: 'crypto', label: 'CRYPTO' },
  { value: 'indices', label: 'INDICES' }
];

export function SymbolModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode = 'catalog',
  isPending = false
}: SymbolModalProps) {
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('forex');
  const [finnhubSymbol, setFinnhubSymbol] = useState('');
  const [dukascopySymbol, setDukascopySymbol] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSymbol(initialData?.symbol || '');
      setDescription(initialData?.description || '');
      setCategory(initialData?.category || 'forex');
      setFinnhubSymbol(initialData?.finnhubSymbol || '');
      setDukascopySymbol(initialData?.dukascopySymbol || '');
      setIsActive(initialData?.isActive !== undefined ? initialData.isActive : true);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const isEdit = Boolean(initialData?.symbol);

  const title =
    mode === 'stream'
      ? isEdit
        ? `EDIT STREAM SYMBOL // ${symbol}`
        : 'ADD NEW FINNHUB STREAM SYMBOL'
      : mode === 'ohlc'
        ? isEdit
          ? `EDIT OHLC SYMBOL // ${symbol}`
          : 'ADD NEW DUKASCOPY OHLC SYMBOL'
        : isEdit
          ? `EDIT INSTRUMENT // ${symbol}`
          : 'ADD NEW MARKET INSTRUMENT';

  const icon = mode === 'stream' ? Activity : mode === 'ohlc' ? Activity : Database;
  const variant = mode === 'stream' ? 'positive' : mode === 'ohlc' ? 'info' : 'accent';
  const saveButtonColor =
    mode === 'stream'
      ? 'bg-positive text-black hover:bg-positive/80'
      : mode === 'ohlc'
        ? 'bg-info text-black hover:opacity-80'
        : 'bg-accent text-black hover:bg-accent/80';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    await onSave({
      symbol: symbol.trim().toUpperCase(),
      description: description.trim(),
      category,
      finnhubSymbol: finnhubSymbol.trim(),
      dukascopySymbol: dukascopySymbol.trim() || undefined,
      isActive
    });
  };

  return (
    <TerminalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      variant={variant}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-mono">
        {/* Symbol Code */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase">
            SYMBOL IDENTIFIER (E.G. EURUSD, XAUUSD, BTCUSD) *
          </label>
          <input
            type="text"
            required
            disabled={isEdit}
            placeholder="EURUSD"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground uppercase focus:outline-none focus:border-accent font-bold disabled:opacity-60"
          />
        </div>

        {/* Finnhub Ticker (stream mode) or Dukascopy Ticker (ohlc mode) */}
        {mode === 'ohlc' ? (
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase">
              DUKASCOPY TICKER (E.G. eurusd, xauusd, btcusd) *
            </label>
            <input
              type="text"
              required
              placeholder="eurusd"
              value={dukascopySymbol}
              onChange={(e) => setDukascopySymbol(e.target.value)}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent font-bold"
            />
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase">
              FINNHUB TICKER (E.G. OANDA:EUR_USD, BINANCE:BTCUSDT){mode === 'stream' ? ' *' : ''}
            </label>
            <input
              type="text"
              required={mode === 'stream'}
              placeholder="OANDA:EUR_USD"
              value={finnhubSymbol}
              onChange={(e) => setFinnhubSymbol(e.target.value)}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent font-bold"
            />
          </div>
        )}

        {/* Description */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase">
            DESCRIPTION / PAIR NAME
          </label>
          <input
            type="text"
            placeholder="Euro / US Dollar"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
          />
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase">CATEGORY</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            {SYMBOL_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dukascopy Ticker (catalog mode only) */}
        {mode === 'catalog' && (
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase">
              DUKASCOPY TICKER MAPPING (E.G. eurusd, btcusd, xauusd)
            </label>
            <input
              type="text"
              placeholder="eurusd"
              value={dukascopySymbol}
              onChange={(e) => setDukascopySymbol(e.target.value)}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            />
          </div>
        )}

        {/* Active Toggle */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="symbol-modal-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-accent cursor-pointer"
          />
          <label
            htmlFor="symbol-modal-active"
            className="text-[11px] text-muted-foreground uppercase cursor-pointer"
          >
            {mode === 'stream'
              ? 'ENABLE LIVE WEBSOCKET TICK SUBSCRIPTION'
              : mode === 'ohlc'
                ? 'ENABLE DUKASCOPY HISTORICAL DATA SYNC'
                : 'ACTIVE IN MARKET CATALOG'}
          </label>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-border bg-black text-muted-foreground hover:text-foreground text-xs"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={`px-4 py-1.5 font-bold uppercase text-xs transition-colors disabled:opacity-50 ${saveButtonColor}`}
          >
            {isPending
              ? 'SAVING...'
              : mode === 'stream'
                ? 'SAVE STREAM SYMBOL'
                : mode === 'ohlc'
                  ? 'SAVE OHLC SYMBOL'
                  : 'SAVE INSTRUMENT'}
          </button>
        </div>
      </form>
    </TerminalModal>
  );
}
