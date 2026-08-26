'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, Search, Plus, RefreshCw } from 'lucide-react';
import {
  useOhlcSymbolsQuery,
  useSaveOhlcSymbolMutation,
  useDeleteOhlcSymbolMutation
} from '@/modules/market/application/queries/use-market-data';
import { OhlcSymbolTable } from './ohlc-symbol-table';
import { PageHeader } from '@/shared/presentation/ui/page-header';
import { FilterBar } from '@/shared/presentation/ui/filter-bar';
import { DestructiveConfirmDialog } from '@/shared/presentation/ui/destructive-confirm-dialog';
import { SymbolModal, type SymbolFormData } from './symbol-modal';
import { PaginationBar } from '@/shared/presentation/ui/pagination-bar';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import { formatFinancialNumber } from '@/shared/utils';

const CATEGORIES = [
  { id: 'all', label: 'ALL OHLC SYMBOLS' },
  { id: 'forex', label: 'FOREX' },
  { id: 'metal', label: 'METALS' },
  { id: 'energy', label: 'ENERGY' },
  { id: 'crypto', label: 'CRYPTO' },
  { id: 'indices', label: 'INDICES' }
];

export function OhlcSymbolsContainer() {
  usePageTitle('OHLC SYMBOLS');
  const { success, error } = useToast();

  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSymbolForEdit, setSelectedSymbolForEdit] =
    useState<Partial<SymbolFormData> | null>(null);
  const [symbolToDelete, setSymbolToDelete] = useState<string | null>(null);

  const {
    data: ohlcSymbols = [],
    isLoading: isSymbolsLoading,
    isError: isSymbolsError,
    isRefetching: isSymbolsRefetching,
    refetch: refetchSymbols
  } = useOhlcSymbolsQuery();

  const saveMutation = useSaveOhlcSymbolMutation();
  const deleteMutation = useDeleteOhlcSymbolMutation();

  const filteredSymbols = useMemo(() => {
    return ohlcSymbols.filter((item) => {
      const matchesCategory =
        category === 'all' || item.category.toLowerCase() === category.toLowerCase();
      const matchesSearch =
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.dukascopySymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [ohlcSymbols, category, searchQuery]);

  const total = filteredSymbols.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedSymbols = useMemo(() => {
    const validPage = Math.min(page, totalPages);
    const start = (validPage - 1) * limit;
    return filteredSymbols.slice(start, start + limit);
  }, [filteredSymbols, page, limit, totalPages]);

  const handleSaveSymbol = async (formData: SymbolFormData) => {
    try {
      await saveMutation.mutateAsync({
        symbol: formData.symbol.toUpperCase(),
        dukascopySymbol: formData.dukascopySymbol || formData.symbol.toLowerCase(),
        description: formData.description,
        isActive: formData.isActive
      });

      success(
        'OHLC SYMBOL SAVED',
        `Symbol ${formData.symbol.toUpperCase()} has been linked to Dukascopy historical data.`
      );
      setIsAddOpen(false);
      setSelectedSymbolForEdit(null);
    } catch (err: any) {
      error('SAVE FAILED', err.message || 'Unable to save OHLC symbol.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!symbolToDelete) return;
    try {
      await deleteMutation.mutateAsync(symbolToDelete);
      success('OHLC SYMBOL REMOVED', `OHLC symbol ${symbolToDelete} deleted.`);
      setSymbolToDelete(null);
    } catch (err: any) {
      error('DELETE FAILED', err.message || 'Unable to delete OHLC symbol.');
    }
  };

  return (
    <div className="space-y-3 font-mono">
      <PageHeader
        title="DUKASCOPY OHLC HISTORICAL DATA SYMBOLS"
        icon={BarChart3}
        iconClassName="text-info"
        subtitle="Configure Dukascopy ticker mappings for historical OHLC candle data synchronization"
        actions={
          <>
            <button
              onClick={() => refetchSymbols()}
              disabled={isSymbolsLoading || isSymbolsRefetching}
              className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh OHLC symbols"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSymbolsRefetching ? 'animate-spin' : ''}`} />
              <span>REFRESH</span>
            </button>
            <button
              onClick={() => {
                setSelectedSymbolForEdit(null);
                setIsAddOpen(true);
              }}
              className="flex items-center gap-1.5 border border-info/40 bg-info/10 hover:bg-info hover:text-black text-info px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD OHLC SYMBOL</span>
            </button>
          </>
        }
      />

      {/* Filter / Search Bar */}
      <FilterBar className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter symbol or Dukascopy ticker..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-surface border border-border pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
                  category === cat.id
                    ? 'border border-accent bg-accent/20 text-accent'
                    : 'border border-border bg-surface hover:bg-surface-hover text-muted-foreground'
                }`}
              >
                {cat.id.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground whitespace-nowrap">
          TOTAL:{' '}
          <strong className="text-foreground tabular-nums">{formatFinancialNumber(total)}</strong>{' '}
          SYMBOLS
        </div>
      </FilterBar>

      {/* OHLC Symbol Table */}
      <OhlcSymbolTable
        symbols={paginatedSymbols}
        isLoading={isSymbolsLoading}
        isError={isSymbolsError}
        onEdit={(sym) => {
          setSelectedSymbolForEdit({
            symbol: sym.symbol,
            description: sym.description || '',
            category: sym.category,
            dukascopySymbol: sym.dukascopySymbol,
            isActive: sym.isActive
          });
          setIsAddOpen(true);
        }}
        onDelete={(sym) => setSymbolToDelete(sym)}
      />

      {/* Pagination Bar */}
      <PaginationBar
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        limitOptions={[10, 25, 50, 100]}
        total={total}
        totalLabel="TOTAL OHLC SYMBOLS"
        isLoading={isSymbolsLoading}
      />

      {/* Add / Edit Symbol Modal */}
      {isAddOpen && (
        <SymbolModal
          isOpen={isAddOpen}
          mode="ohlc"
          initialData={selectedSymbolForEdit}
          onClose={() => {
            setIsAddOpen(false);
            setSelectedSymbolForEdit(null);
          }}
          onSave={handleSaveSymbol}
          isPending={saveMutation.isPending}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DestructiveConfirmDialog
        isOpen={Boolean(symbolToDelete)}
        onClose={() => setSymbolToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="DELETE OHLC SYMBOL"
        description={`Are you sure you want to permanently remove "${symbolToDelete}" from Dukascopy historical data sync?`}
        targetIdentifier={symbolToDelete || ''}
        confirmButtonText="DELETE SYMBOL"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
