'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Database,
  Edit2,
  RefreshCw,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import {
  useMarketSymbolsQuery,
  useSaveSymbolMutation,
  useDeleteSymbolMutation
} from '@/lib/queries/use-market-data';
import { DestructiveConfirmDialog } from '@/components/ui/destructive-confirm-dialog';
import { useToast } from '@/components/ui/terminal-toast';
import type { MarketSymbol } from '@/lib/types';

const CATEGORIES = [
  { id: 'all', label: 'ALL INSTRUMENTS' },
  { id: 'forex', label: 'FOREX (MAJORS & CROSSES)' },
  { id: 'metal', label: 'PRECIOUS METALS' },
  { id: 'energy', label: 'ENERGY (OIL & GAS)' },
  { id: 'crypto', label: 'CRYPTO ASSETS' },
  { id: 'indices', label: 'GLOBAL INDICES' }
];

export default function MarketDataPage() {
  const { success, error } = useToast();
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states for Symbol Management
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [symbolToDelete, setSymbolToDelete] = useState<string | null>(null);

  // Form states for Add/Edit Symbol
  const [formSymbol, setFormSymbol] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('forex');
  const [formFinnhubSymbol, setFormFinnhubSymbol] = useState('');
  const [formDukascopySymbol, setFormDukascopySymbol] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // 1. Fetch Dynamic Symbols from PostgreSQL "symbols" Table
  const {
    data: dbSymbols = [],
    isLoading: isSymbolsLoading,
    refetch
  } = useMarketSymbolsQuery(false);

  // 2. Mutations for Database Symbol Management
  const saveSymbolMutation = useSaveSymbolMutation();
  const deleteSymbolMutation = useDeleteSymbolMutation();

  const handleSaveSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSymbol.trim()) return;

    try {
      await saveSymbolMutation.mutateAsync({
        symbol: formSymbol.trim().toUpperCase(),
        description: formDescription.trim() || undefined,
        category: formCategory,
        finnhubSymbol: formFinnhubSymbol.trim() || undefined,
        dukascopySymbol: formDukascopySymbol.trim() || undefined,
        isActive: formIsActive
      });

      success('INSTRUMENT SAVED', `Market symbol "${formSymbol.toUpperCase()}" saved to PostgreSQL symbols table.`);
      setIsAddOpen(false);
      resetForm();
    } catch (err: any) {
      error('SAVE FAILED', err.message || 'Failed to save instrument to database.');
    }
  };

  const handleToggleActive = async (symbol: MarketSymbol) => {
    try {
      await saveSymbolMutation.mutateAsync({
        symbol: symbol.symbol,
        description: symbol.description || symbol.name,
        category: symbol.category,
        finnhubSymbol: symbol.finnhubSymbol,
        dukascopySymbol: symbol.dukascopySymbol,
        isActive: !symbol.isActive
      });
      success(
        'STATUS UPDATED',
        `Symbol "${symbol.symbol}" is now ${!symbol.isActive ? 'ACTIVE' : 'INACTIVE'}.`
      );
    } catch (err: any) {
      error('UPDATE FAILED', err.message || 'Failed to update symbol status.');
    }
  };

  const handleDeleteSymbol = async () => {
    if (!symbolToDelete) return;
    try {
      await deleteSymbolMutation.mutateAsync(symbolToDelete);
      success('SYMBOL DELETED', `Market instrument "${symbolToDelete}" removed from database.`);
      setSymbolToDelete(null);
    } catch (err: any) {
      error('DELETE FAILED', err.message || 'Failed to delete symbol.');
    }
  };

  const resetForm = () => {
    setFormSymbol('');
    setFormDescription('');
    setFormCategory('forex');
    setFormFinnhubSymbol('');
    setFormDukascopySymbol('');
    setFormIsActive(true);
  };

  const filteredInstruments = useMemo(() => {
    return dbSymbols.filter((s) => {
      const matchCat = category === 'all' || s.category.toLowerCase().includes(category.toLowerCase());
      const matchSearch =
        !searchQuery ||
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description || s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.finnhubSymbol || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.dukascopySymbol || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [dbSymbols, category, searchQuery]);

  return (
    <div className="space-y-6 font-mono max-w-7xl mx-auto">
      {/* 1. Header Titlebar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              MARKET INSTRUMENTS CATALOG // SYMBOLS TABLE
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Master database directory of tradable instruments and provider data source mappings (<code className="text-accent">symbols</code> table)
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 border border-border bg-black px-2.5 py-1 text-muted-foreground">
            <Database className="w-3 h-3 text-accent" />
            <span>TOTAL: {dbSymbols.length} INSTRUMENTS</span>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="flex items-center space-x-1.5 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-1 font-bold uppercase tracking-wider transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>ADD INSTRUMENT</span>
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
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-border bg-black text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="relative w-full sm:w-96">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="SEARCH SYMBOL, DESCRIPTION, OR TICKER..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-border pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>FILTERED: <strong className="text-foreground">{filteredInstruments.length}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Instruments Table */}
      {isSymbolsLoading ? (
        <div className="border border-border bg-surface p-12 text-center text-xs text-muted-foreground animate-pulse">
          FETCHING INSTRUMENTS FROM POSTGRESQL SYMBOLS TABLE...
        </div>
      ) : filteredInstruments.length === 0 ? (
        <div className="border border-border bg-surface p-12 text-center text-xs text-muted-foreground space-y-3">
          <Database className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="uppercase font-bold tracking-wider">NO INSTRUMENTS FOUND IN DATABASE</p>
          <p className="text-[11px]">Click "ADD INSTRUMENT" above to insert a new tradable symbol into PostgreSQL.</p>
        </div>
      ) : (
        <div className="border border-border bg-surface overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-black text-muted-foreground text-[10px] uppercase tracking-wider">
                <th className="p-3">SYMBOL</th>
                <th className="p-3">CATEGORY</th>
                <th className="p-3">FINNHUB TICKER</th>
                <th className="p-3">DUKASCOPY TICKER</th>
                <th className="p-3 text-center">TRADABLE STATUS</th>
                <th className="p-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredInstruments.map((item) => (
                <tr
                  key={item.symbol}
                  className="hover:bg-black/40 transition-colors font-mono"
                >
                  <td className="p-3">
                    <div className="font-bold text-foreground">{item.symbol}</div>
                    <div className="text-[10px] text-muted-foreground">{item.description || item.name || item.symbol}</div>
                  </td>

                  <td className="p-3">
                    <span className="text-[9px] border border-border/80 bg-black px-1.5 py-0.5 text-muted-foreground uppercase">
                      {item.category}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className="text-[10px] text-accent font-mono">
                      {item.finnhubSymbol || '—'}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {item.dukascopySymbol || '—'}
                    </span>
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
                      title="Click to toggle active/inactive"
                    >
                      {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>

                  <td className="p-3 text-right space-x-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFormSymbol(item.symbol);
                        setFormDescription(item.description || item.name || '');
                        setFormCategory(item.category);
                        setFormFinnhubSymbol(item.finnhubSymbol || '');
                        setFormDukascopySymbol(item.dukascopySymbol || '');
                        setFormIsActive(item.isActive);
                        setIsAddOpen(true);
                      }}
                      className="p-1 border border-border bg-black text-muted-foreground hover:text-accent hover:border-accent"
                      title="Edit Instrument"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSymbolToDelete(item.symbol)}
                      className="p-1 border border-border bg-black text-muted-foreground hover:text-negative hover:border-negative"
                      title="Delete Instrument from Database"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Add/Edit Instrument Modal Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border-2 border-accent bg-surface max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 font-mono">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <span className="text-xs font-bold text-accent uppercase tracking-wider">
                {formSymbol ? `EDIT INSTRUMENT // ${formSymbol}` : 'ADD NEW MARKET INSTRUMENT'}
              </span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                [ESC]
              </button>
            </div>

            <form onSubmit={handleSaveSymbol} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">SYMBOL IDENTIFIER (E.G. EURUSD, XAUUSD, BTCUSD)</label>
                <input
                  type="text"
                  required
                  placeholder="EURUSD"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground uppercase focus:outline-none focus:border-accent font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">DESCRIPTION / PAIR NAME</label>
                <input
                  type="text"
                  placeholder="Euro / US Dollar"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">CATEGORY</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                >
                  <option value="forex">FOREX</option>
                  <option value="metal">PRECIOUS METALS</option>
                  <option value="energy">ENERGY</option>
                  <option value="crypto">CRYPTO</option>
                  <option value="indices">INDICES</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">FINNHUB TICKER MAPPING (E.G. OANDA:EUR_USD, BINANCE:BTCUSDT)</label>
                <input
                  type="text"
                  placeholder="OANDA:EUR_USD"
                  value={formFinnhubSymbol}
                  onChange={(e) => setFormFinnhubSymbol(e.target.value)}
                  className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase">DUKASCOPY TICKER MAPPING (E.G. eurusd, btcusd, xauusd)</label>
                <input
                  type="text"
                  placeholder="eurusd"
                  value={formDukascopySymbol}
                  onChange={(e) => setFormDukascopySymbol(e.target.value)}
                  className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="symbol-is-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="accent-accent"
                />
                <label htmlFor="symbol-is-active" className="text-[11px] text-muted-foreground uppercase cursor-pointer">
                  ACTIVE IN MARKET CATALOG
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
                  disabled={saveSymbolMutation.isPending}
                  className="px-4 py-1.5 bg-accent text-black font-bold uppercase text-xs hover:bg-accent/80 transition-colors disabled:opacity-50"
                >
                  SAVE INSTRUMENT
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
        onConfirm={handleDeleteSymbol}
        title="REMOVE INSTRUMENT FROM CATALOG"
        description={`This will permanently delete instrument "${symbolToDelete}" from the master symbols table.`}
        targetIdentifier={symbolToDelete || ''}
        confirmButtonText="DELETE INSTRUMENT NOW"
        isLoading={deleteSymbolMutation.isPending}
      />
    </div>
  );
}
