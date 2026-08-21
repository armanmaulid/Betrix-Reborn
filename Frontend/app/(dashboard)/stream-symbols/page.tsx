'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Radio,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  SlidersHorizontal,
  Layers,
  Database,
  Edit2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import {
  useStreamSymbolsQuery,
  useRealtimeMarketStream,
  useSaveStreamSymbolMutation,
  useDeleteStreamSymbolMutation
} from '@/lib/queries/use-market-data';
import { DestructiveConfirmDialog } from '@/components/ui/destructive-confirm-dialog';
import { useToast } from '@/components/ui/terminal-toast';
import type { StreamSymbol } from '@/lib/types';

const CATEGORIES = [
  { id: 'all', label: 'ALL STREAM SYMBOLS' },
  { id: 'forex', label: 'FOREX (MAJORS & CROSSES)' },
  { id: 'metal', label: 'METALS (GOLD/SILVER)' },
  { id: 'energy', label: 'ENERGY (CRUDE OIL)' },
  { id: 'crypto', label: 'CRYPTO ASSETS' },
  { id: 'indices', label: 'GLOBAL INDICES' }
];

export default function StreamSymbolsPage() {
  const { success, error } = useToast();
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [symbolToDelete, setSymbolToDelete] = useState<string | null>(null);

  // Form states for Add/Edit Stream Symbol
  const [formSymbol, setFormSymbol] = useState('');
  const [formFinnhubSymbol, setFormFinnhubSymbol] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('forex');
  const [formIsActive, setFormIsActive] = useState(true);

  // 1. Fetch Dynamic Stream Symbols from "stream_symbols" Table
  const {
    data: streamSymbols = [],
    isLoading: isSymbolsLoading,
    refetch: refetchSymbols
  } = useStreamSymbolsQuery(false);

  // 2. Real-Time Stream Hook (Finnhub WS Ingester - Zero Client Polling)
  const {
    priceMap,
    isConnected,
    isLoading: isStreamLoading
  } = useRealtimeMarketStream();

  // 3. Mutations for Database stream_symbols Table
  const saveMutation = useSaveStreamSymbolMutation();
  const deleteMutation = useDeleteStreamSymbolMutation();

  const handleSaveStreamSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSymbol.trim() || !formFinnhubSymbol.trim()) return;

    try {
      await saveMutation.mutateAsync({
        symbol: formSymbol.trim().toUpperCase(),
        finnhubSymbol: formFinnhubSymbol.trim(),
        description: formDescription.trim() || undefined,
        category: formCategory,
        isActive: formIsActive
      });

      success(
        'STREAM SYMBOL SAVED',
        `Stream instrument "${formSymbol.toUpperCase()}" (${formFinnhubSymbol}) saved to stream_symbols table.`
      );
      setIsAddOpen(false);
      resetForm();
    } catch (err: any) {
      error('SAVE FAILED', err.message || 'Failed to save stream symbol.');
    }
  };

  const handleToggleActive = async (item: StreamSymbol) => {
    try {
      await saveMutation.mutateAsync({
        symbol: item.symbol,
        finnhubSymbol: item.finnhubSymbol,
        description: item.description,
        category: item.category,
        isActive: !item.isActive
      });
      success(
        'STATUS UPDATED',
        `Stream symbol "${item.symbol}" is now ${!item.isActive ? 'ACTIVE' : 'INACTIVE'}.`
      );
    } catch (err: any) {
      error('UPDATE FAILED', err.message || 'Failed to update status.');
    }
  };

  const handleDeleteStreamSymbol = async () => {
    if (!symbolToDelete) return;
    try {
      await deleteMutation.mutateAsync(symbolToDelete);
      success('STREAM SYMBOL DELETED', `Symbol "${symbolToDelete}" removed from stream_symbols database.`);
      setSymbolToDelete(null);
    } catch (err: any) {
      error('DELETE FAILED', err.message || 'Failed to delete symbol.');
    }
  };

  const resetForm = () => {
    setFormSymbol('');
    setFormFinnhubSymbol('');
    setFormDescription('');
    setFormCategory('forex');
    setFormIsActive(true);
  };

  const filteredSymbols = useMemo(() => {
    return streamSymbols.filter((s) => {
      const matchCat = category === 'all' || s.category.toLowerCase().includes(category.toLowerCase());
      const matchSearch =
        !searchQuery ||
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.finnhubSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [streamSymbols, category, searchQuery]);

  const formatPrice = (price?: number, cat?: string) => {
    if (price === undefined || price === null || isNaN(price) || price === 0) return '---.---';
    if (cat === 'crypto' || price > 500) return price.toFixed(2);
    if (price > 50) return price.toFixed(3);
    return price.toFixed(5);
  };

  return (
    <div className="space-y-6 font-mono max-w-7xl mx-auto">
      {/* 1. Header Titlebar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-positive animate-pulse" />
            <h1 className="text-sm font-bold tracking-wider text-positive uppercase">
              FINNHUB REAL-TIME STREAM // STREAM_SYMBOLS TABLE
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time WebSocket tick stream sourced dynamically from PostgreSQL <code className="text-accent">stream_symbols</code> table
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 border border-border bg-black px-2.5 py-1 text-muted-foreground">
            <span className={`h-2 w-2 rounded-full inline-block ${isConnected ? 'bg-positive animate-ping' : 'bg-accent'}`}></span>
            <span>STREAM: {isConnected ? 'LIVE WEBSOCKET (ZERO-POLL)' : 'CONNECTING'}</span>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="flex items-center space-x-1.5 border border-positive/40 bg-positive/10 hover:bg-positive hover:text-black text-positive px-3 py-1 font-bold uppercase tracking-wider transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>ADD STREAM SYMBOL</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Controls Bar */}
      <div className="border border-border bg-surface p-4 space-y-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1 border font-bold uppercase tracking-wider transition-colors ${
                category === cat.id
                  ? 'border-positive bg-positive/20 text-positive'
                  : 'border-border bg-black text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search and Layout Toggle */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="SEARCH STREAM SYMBOL OR FINNHUB TICKER..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-border pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-positive"
            />
          </div>

          <div className="flex items-center gap-1 text-xs w-full sm:w-auto justify-end">
            <span className="text-muted-foreground text-[10px] uppercase mr-2">
              STREAM_SYMBOLS: <strong className="text-foreground">{filteredSymbols.length}</strong> ACTIVE TICKERS
            </span>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 border text-[10px] font-bold ${
                viewMode === 'table' ? 'border-positive bg-positive/20 text-positive' : 'border-border bg-black text-muted-foreground'
              }`}
            >
              TABLE VIEW
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 border text-[10px] font-bold ${
                viewMode === 'grid' ? 'border-positive bg-positive/20 text-positive' : 'border-border bg-black text-muted-foreground'
              }`}
            >
              GRID VIEW
            </button>
          </div>
        </div>
      </div>

      {/* 3. Stream Symbols Display */}
      {isSymbolsLoading ? (
        <div className="border border-border bg-surface p-12 text-center text-xs text-muted-foreground animate-pulse">
          QUERYING STREAM_SYMBOLS TABLE IN POSTGRESQL...
        </div>
      ) : filteredSymbols.length === 0 ? (
        <div className="border border-border bg-surface p-12 text-center text-xs text-muted-foreground space-y-3">
          <Database className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="uppercase font-bold tracking-wider">NO STREAM SYMBOLS CONFIGURED IN STREAM_SYMBOLS TABLE</p>
          <p className="text-[11px]">Click "ADD STREAM SYMBOL" to register verified Finnhub tickers.</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="border border-border bg-surface overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-black text-muted-foreground text-[10px] uppercase tracking-wider">
                <th className="p-3">SYMBOL</th>
                <th className="p-3">FINNHUB TICKER</th>
                <th className="p-3">CATEGORY</th>
                <th className="p-3 text-right">LIVE BID</th>
                <th className="p-3 text-right">LIVE ASK</th>
                <th className="p-3 text-center">STREAM STATUS</th>
                <th className="p-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredSymbols.map((item) => {
                const tick = priceMap.get(item.symbol.toUpperCase());

                return (
                  <tr
                    key={item.symbol}
                    className="hover:bg-black/40 transition-colors font-mono"
                  >
                    <td className="p-3">
                      <div className="font-bold text-foreground">{item.symbol}</div>
                      <div className="text-[10px] text-muted-foreground">{item.description || item.symbol}</div>
                    </td>

                    <td className="p-3">
                      <span className="text-[11px] text-accent font-mono border border-accent/30 bg-black px-1.5 py-0.5">
                        {item.finnhubSymbol}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="text-[9px] border border-border/80 bg-black px-1.5 py-0.5 text-muted-foreground uppercase">
                        {item.category}
                      </span>
                    </td>

                    <td className="p-3 text-right font-bold text-foreground tabular-nums">
                      {formatPrice(tick?.bid, item.category)}
                    </td>

                    <td className="p-3 text-right font-bold text-foreground tabular-nums">
                      {formatPrice(tick?.ask, item.category)}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        className={`text-[10px] font-bold border px-1.5 py-0.5 transition-colors ${
                          item.isActive
                            ? 'border-positive/40 bg-positive/10 text-positive hover:bg-positive/20'
                            : 'border-negative/40 bg-negative/10 text-negative hover:bg-negative/20'
                        }`}
                        title="Click to toggle streaming status"
                      >
                        {item.isActive ? 'STREAMING' : 'DISABLED'}
                      </button>
                    </td>

                    <td className="p-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFormSymbol(item.symbol);
                          setFormFinnhubSymbol(item.finnhubSymbol);
                          setFormDescription(item.description || '');
                          setFormCategory(item.category);
                          setFormIsActive(item.isActive);
                          setIsAddOpen(true);
                        }}
                        className="p-1 border border-border bg-black text-muted-foreground hover:text-accent hover:border-accent"
                        title="Edit Stream Symbol"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSymbolToDelete(item.symbol)}
                        className="p-1 border border-border bg-black text-muted-foreground hover:text-negative hover:border-negative"
                        title="Delete Stream Symbol"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSymbols.map((item) => {
            const tick = priceMap.get(item.symbol.toUpperCase());

            return (
              <div
                key={item.symbol}
                className="border border-border bg-surface p-4 flex flex-col justify-between space-y-3 hover:border-positive/60 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-foreground">{item.symbol}</span>
                        <span className="text-[9px] border border-border bg-black px-1 text-muted-foreground uppercase">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{item.description || item.symbol}</div>
                    </div>

                    <span className="text-[10px] text-accent font-mono border border-border/60 bg-black px-2 py-0.5">
                      {item.finnhubSymbol}
                    </span>
                  </div>

                  <div className="mt-2 text-[10px] text-accent font-mono border border-border/60 bg-black p-1">
                    FINNHUB TICKER: {item.finnhubSymbol}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-border/60">
                    <div className="border border-border/60 bg-black p-2">
                      <div className="text-[9px] text-muted-foreground uppercase">LIVE BID</div>
                      <div className="text-sm font-bold text-foreground tabular-nums mt-0.5">
                        {formatPrice(tick?.bid, item.category)}
                      </div>
                    </div>

                    <div className="border border-border/60 bg-black p-2">
                      <div className="text-[9px] text-muted-foreground uppercase">LIVE ASK</div>
                      <div className="text-sm font-bold text-foreground tabular-nums mt-0.5">
                        {formatPrice(tick?.ask, item.category)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className={`text-[9px] font-bold border px-1 py-0.2 ${item.isActive ? 'text-positive border-positive/40' : 'text-negative border-negative/40'}`}
                  >
                    {item.isActive ? 'STREAMING' : 'DISABLED'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFormSymbol(item.symbol);
                        setFormFinnhubSymbol(item.finnhubSymbol);
                        setFormDescription(item.description || '');
                        setFormCategory(item.category);
                        setFormIsActive(item.isActive);
                        setIsAddOpen(true);
                      }}
                      className="text-muted-foreground hover:text-accent p-0.5"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSymbolToDelete(item.symbol)}
                      className="text-muted-foreground hover:text-negative p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Add/Edit Stream Symbol Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border-2 border-positive bg-surface max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 font-mono">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <span className="text-xs font-bold text-positive uppercase tracking-wider">
                {formSymbol ? `EDIT STREAM SYMBOL // ${formSymbol}` : 'ADD FINNHUB STREAM SYMBOL'}
              </span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                [ESC]
              </button>
            </div>

            <form onSubmit={handleSaveStreamSymbol} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">SYMBOL (E.G. EURUSD, BTCUSD, XAUUSD)</label>
                <input
                  type="text"
                  required
                  placeholder="EURUSD"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground uppercase focus:outline-none focus:border-positive font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">FINNHUB TICKER (E.G. OANDA:EUR_USD, BINANCE:BTCUSDT)</label>
                <input
                  type="text"
                  required
                  placeholder="OANDA:EUR_USD"
                  value={formFinnhubSymbol}
                  onChange={(e) => setFormFinnhubSymbol(e.target.value)}
                  className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-positive font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">DESCRIPTION</label>
                <input
                  type="text"
                  placeholder="Euro / US Dollar"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-positive"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">CATEGORY</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-positive"
                >
                  <option value="forex">FOREX</option>
                  <option value="metal">PRECIOUS METALS</option>
                  <option value="energy">ENERGY</option>
                  <option value="crypto">CRYPTO</option>
                  <option value="indices">INDICES</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="stream-symbol-is-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="accent-positive"
                />
                <label htmlFor="stream-symbol-is-active" className="text-[11px] text-muted-foreground uppercase cursor-pointer">
                  ENABLE LIVE WEBSOCKET TICK SUBSCRIPTION
                </label>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 border border-border bg-black text-muted-foreground hover:text-foreground text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-1.5 bg-positive text-black font-bold uppercase text-xs hover:bg-positive/80 transition-colors disabled:opacity-50"
                >
                  SAVE STREAM SYMBOL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
      <DestructiveConfirmDialog
        isOpen={Boolean(symbolToDelete)}
        onClose={() => setSymbolToDelete(null)}
        onConfirm={handleDeleteStreamSymbol}
        title="REMOVE STREAM SYMBOL"
        description={`Are you sure you want to remove "${symbolToDelete}" from the stream_symbols table and stop its Finnhub WebSocket telemetry?`}
        confirmButtonText="CONFIRM DELETE"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
