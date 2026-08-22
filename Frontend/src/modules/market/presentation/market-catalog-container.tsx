'use client';

import React, { useState, useMemo } from 'react';
import { Layers, Search, Plus, RefreshCw } from 'lucide-react';
import {
  useMarketSymbolsQuery,
  useSaveSymbolMutation,
  useDeleteSymbolMutation
} from '@/modules/market/application/queries/use-market-data';
import { MarketCatalogTable } from './market-catalog-table';
import { DestructiveConfirmDialog } from '@/shared/presentation/ui/destructive-confirm-dialog';
import { SymbolModal, type SymbolFormData } from './symbol-modal';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import type { MarketInstrument } from '@market/domain/entities/MarketInstrument';

const CATEGORIES = [
  { id: 'all', label: 'ALL INSTRUMENTS' },
  { id: 'forex', label: 'FOREX (MAJORS & CROSSES)' },
  { id: 'metal', label: 'PRECIOUS METALS' },
  { id: 'energy', label: 'ENERGY (OIL & GAS)' },
  { id: 'crypto', label: 'CRYPTO ASSETS' },
  { id: 'indices', label: 'GLOBAL INDICES' }
];

export function MarketCatalogContainer() {
  usePageTitle('MARKET CATALOG');
  const { success, error } = useToast();
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states for Symbol Management
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSymbolForEdit, setSelectedSymbolForEdit] = useState<Partial<SymbolFormData> | null>(null);
  const [symbolToDelete, setSymbolToDelete] = useState<string | null>(null);

  const {
    data: dbSymbols = [],
    isLoading: isSymbolsLoading,
    isError: isSymbolsError,
    isRefetching: isSymbolsRefetching,
    refetch
  } = useMarketSymbolsQuery(false);

  const saveSymbolMutation = useSaveSymbolMutation();
  const deleteSymbolMutation = useDeleteSymbolMutation();

  const handleSaveSymbol = async (formData: SymbolFormData) => {
    try {
      await saveSymbolMutation.mutateAsync({
        symbol: formData.symbol.toUpperCase(),
        name: formData.description || formData.symbol.toUpperCase(),
        category: formData.category,
        finnhubSymbol: formData.finnhubSymbol || undefined,
        dukascopySymbol: formData.dukascopySymbol || undefined,
        description: formData.description,
        isActive: formData.isActive
      });

      success(
        'CATALOG UPDATED',
        `Instrument ${formData.symbol.toUpperCase()} has been saved to master symbols registry.`
      );
      setIsAddOpen(false);
      setSelectedSymbolForEdit(null);
    } catch (err: any) {
      error('SAVE FAILED', err.message || 'Unable to update symbols table.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!symbolToDelete) return;
    try {
      await deleteSymbolMutation.mutateAsync(symbolToDelete);
      success('INSTRUMENT PURGED', `Symbol ${symbolToDelete} removed from master symbols catalog.`);
      setSymbolToDelete(null);
    } catch (err: any) {
      error('DELETE FAILED', err.message || 'Unable to remove symbol from database.');
    }
  };

  const filteredSymbols = useMemo(() => {
    return dbSymbols.filter((item) => {
      const matchesCategory = category === 'all' || item.category.toLowerCase() === category.toLowerCase();
      const matchesSearch =
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [dbSymbols, category, searchQuery]);

  return (
    <div className="space-y-4 font-mono">
      {/* Top Header Bar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              MASTER FINANCIAL INSTRUMENT CATALOG
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage global asset definitions, tick precision, pip sizing, and data vendor mappings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isSymbolsLoading || isSymbolsRefetching}
            className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh database symbols"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSymbolsRefetching ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
          <button
            onClick={() => {
              setSelectedSymbolForEdit(null);
              setIsAddOpen(true);
            }}
            className="flex items-center gap-1.5 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD INSTRUMENT</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="border border-border bg-black p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search symbol, name, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
                  category === cat.id
                    ? 'border border-accent bg-accent/20 text-accent'
                    : 'border border-border bg-surface hover:bg-surface-hover text-muted-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Master Catalog Table View */}
      <MarketCatalogTable
        instruments={filteredSymbols}
        isLoading={isSymbolsLoading}
        isError={isSymbolsError}
        onEdit={(inst) => {
          setSelectedSymbolForEdit({
            symbol: inst.symbol,
            description: inst.description || inst.name,
            category: inst.category,
            finnhubSymbol: inst.finnhubSymbol || '',
            dukascopySymbol: inst.dukascopySymbol || '',
            isActive: inst.isActive
          });
          setIsAddOpen(true);
        }}
        onDelete={(sym) => setSymbolToDelete(sym)}
      />

      {/* Add / Edit Symbol Modal */}
      {isAddOpen && (
        <SymbolModal
          isOpen={isAddOpen}
          mode="catalog"
          initialData={selectedSymbolForEdit}
          onClose={() => {
            setIsAddOpen(false);
            setSelectedSymbolForEdit(null);
          }}
          onSave={handleSaveSymbol}
          isPending={saveSymbolMutation.isPending}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DestructiveConfirmDialog
        isOpen={Boolean(symbolToDelete)}
        onClose={() => setSymbolToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="DELETE MASTER INSTRUMENT"
        description={`Are you sure you want to permanently remove "${symbolToDelete}" from the master symbols catalog?`}
        targetIdentifier={symbolToDelete || ''}
        confirmButtonText="DELETE FROM CATALOG"
        isLoading={deleteSymbolMutation.isPending}
      />
    </div>
  );
}
