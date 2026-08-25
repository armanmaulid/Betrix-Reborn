'use client';

import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Database, Activity } from 'lucide-react';
import { TerminalModal } from '@/shared/presentation/ui/terminal-modal';
import {
  buildSymbolSchema,
  SYMBOL_CATEGORIES,
  type SymbolFormValues
} from '@market/application/schemas/symbol.schema';

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

export function SymbolModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode = 'catalog',
  isPending = false
}: SymbolModalProps) {
  const schema = useMemo(() => buildSymbolSchema(mode), [mode]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<SymbolFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      symbol: '',
      description: '',
      category: 'forex',
      finnhubSymbol: '',
      dukascopySymbol: '',
      isActive: true
    }
  });

  const watchedSymbol = watch('symbol');

  // Reset the form whenever the dialog opens (prevents stale cancel+reopen state)
  useEffect(() => {
    if (isOpen) {
      reset({
        symbol: initialData?.symbol || '',
        description: initialData?.description || '',
        category: (initialData?.category as SymbolFormValues['category']) || 'forex',
        finnhubSymbol: initialData?.finnhubSymbol || '',
        dukascopySymbol: initialData?.dukascopySymbol || '',
        isActive: initialData?.isActive !== undefined ? initialData.isActive : true
      });
    }
  }, [isOpen, initialData, reset]);

  if (!isOpen) return null;

  const isEdit = Boolean(initialData?.symbol);

  const title =
    mode === 'stream'
      ? isEdit
        ? `EDIT STREAM SYMBOL // ${watchedSymbol}`
        : 'ADD NEW FINNHUB STREAM SYMBOL'
      : mode === 'ohlc'
        ? isEdit
          ? `EDIT OHLC SYMBOL // ${watchedSymbol}`
          : 'ADD NEW DUKASCOPY OHLC SYMBOL'
        : isEdit
          ? `EDIT INSTRUMENT // ${watchedSymbol}`
          : 'ADD NEW MARKET INSTRUMENT';

  const icon = mode === 'catalog' ? Database : Activity;
  const variant = mode === 'stream' ? 'positive' : mode === 'ohlc' ? 'info' : 'accent';
  const saveButtonColor =
    mode === 'stream'
      ? 'bg-positive text-black hover:bg-positive/80'
      : mode === 'ohlc'
        ? 'bg-info text-black hover:opacity-80'
        : 'bg-accent text-black hover:bg-accent/80';

  const onValid = async (values: SymbolFormValues) => {
    await onSave({
      symbol: values.symbol.trim().toUpperCase(),
      description: values.description.trim(),
      category: values.category,
      finnhubSymbol: (values.finnhubSymbol ?? '').trim(),
      dukascopySymbol: (values.dukascopySymbol ?? '').trim() || undefined,
      isActive: values.isActive
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
      <form onSubmit={handleSubmit(onValid)} className="p-5 space-y-4 text-xs font-mono">
        {/* Symbol Code */}
        <div className="space-y-1">
          <label htmlFor="symbol-modal-symbol" className="text-[10px] text-muted-foreground uppercase">
            SYMBOL IDENTIFIER (E.G. EURUSD, XAUUSD, BTCUSD) *
          </label>
          <input
            id="symbol-modal-symbol"
            type="text"
            disabled={isEdit}
            placeholder="EURUSD"
            {...register('symbol')}
            onChange={(e) => {
              // keep uppercase-only UX while staying RHF-controlled
              e.target.value = e.target.value.toUpperCase();
              register('symbol').onChange(e);
            }}
            className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground uppercase focus:outline-none focus:border-accent font-bold disabled:opacity-60"
          />
          {errors.symbol && <p className="text-[10px] text-negative">{errors.symbol.message}</p>}
        </div>

        {/* Finnhub Ticker (stream mode) or Dukascopy Ticker (ohlc mode) */}
        {mode === 'ohlc' ? (
          <div className="space-y-1">
            <label
              htmlFor="symbol-modal-provider"
              className="text-[10px] text-muted-foreground uppercase"
            >
              DUKASCOPY TICKER (E.G. eurusd, xauusd, btcusd) *
            </label>
            <input
              id="symbol-modal-provider"
              type="text"
              placeholder="eurusd"
              {...register('dukascopySymbol')}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent font-bold"
            />
            {errors.dukascopySymbol && (
              <p className="text-[10px] text-negative">{errors.dukascopySymbol.message}</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <label
              htmlFor="symbol-modal-provider"
              className="text-[10px] text-muted-foreground uppercase"
            >
              FINNHUB TICKER (E.G. OANDA:EUR_USD, BINANCE:BTCUSDT){mode === 'stream' ? ' *' : ''}
            </label>
            <input
              id="symbol-modal-provider"
              type="text"
              placeholder="OANDA:EUR_USD"
              {...register('finnhubSymbol')}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent font-bold"
            />
            {errors.finnhubSymbol && (
              <p className="text-[10px] text-negative">{errors.finnhubSymbol.message}</p>
            )}
          </div>
        )}

        {/* Description */}
        <div className="space-y-1">
          <label
            htmlFor="symbol-modal-description"
            className="text-[10px] text-muted-foreground uppercase"
          >
            DESCRIPTION / PAIR NAME
          </label>
          <input
            id="symbol-modal-description"
            type="text"
            placeholder="Euro / US Dollar"
            {...register('description')}
            className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
          />
          {errors.description && (
            <p className="text-[10px] text-negative">{errors.description.message}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label
            htmlFor="symbol-modal-category"
            className="text-[10px] text-muted-foreground uppercase"
          >
            CATEGORY
          </label>
          <select
            id="symbol-modal-category"
            {...register('category')}
            className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            {SYMBOL_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {errors.category && <p className="text-[10px] text-negative">{errors.category.message}</p>}
        </div>

        {/* Dukascopy Ticker (catalog mode only) */}
        {mode === 'catalog' && (
          <div className="space-y-1">
            <label
              htmlFor="symbol-modal-dukascopy"
              className="text-[10px] text-muted-foreground uppercase"
            >
              DUKASCOPY TICKER MAPPING (E.G. eurusd, btcusd, xauusd)
            </label>
            <input
              id="symbol-modal-dukascopy"
              type="text"
              placeholder="eurusd"
              {...register('dukascopySymbol')}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            />
            {errors.dukascopySymbol && (
              <p className="text-[10px] text-negative">{errors.dukascopySymbol.message}</p>
            )}
          </div>
        )}

        {/* Active Toggle */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="symbol-modal-active"
            {...register('isActive')}
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
