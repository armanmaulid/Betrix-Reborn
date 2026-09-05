'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Radio, Search, Plus, RefreshCw } from 'lucide-react';
import {
  useStreamSymbolsQuery,
  useRealtimeMarketStream,
  useSaveStreamSymbolMutation,
  useDeleteStreamSymbolMutation
} from '@/modules/market/application/queries/use-market-data';
import { StreamSymbolTable } from './stream-symbol-table';
import { PageHeader } from '@/shared/presentation/ui/page-header';
import { FilterBar } from '@/shared/presentation/ui/filter-bar';
import { DestructiveConfirmDialog } from '@/shared/presentation/ui/destructive-confirm-dialog';
import { SymbolModal, type SymbolFormData } from './symbol-modal';
import { PaginationBar } from '@/shared/presentation/ui/pagination-bar';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import { formatFinancialNumber } from '@/shared/utils';

const CATEGORIES = [
  { id: 'all', label: 'ALL STREAM SYMBOLS' },
  { id: 'forex', label: 'FOREX (MAJORS & CROSSES)' },
  { id: 'metal', label: 'METALS (GOLD/SILVER)' },
  { id: 'energy', label: 'ENERGY (CRUDE OIL)' },
  { id: 'crypto', label: 'CRYPTO ASSETS' },
  { id: 'indices', label: 'GLOBAL INDICES' }
];

export function StreamSymbolsContainer() {
  usePageTitle('STREAM SYMBOLS');
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
    data: streamSymbols = [],
    isLoading: isSymbolsLoading,
    isError: isSymbolsError,
    isRefetching: isSymbolsRefetching,
    refetch: refetchSymbols
  } = useStreamSymbolsQuery(false);

  const { priceMap, isConnected } = useRealtimeMarketStream();

  const saveMutation = useSaveStreamSymbolMutation();
  const deleteMutation = useDeleteStreamSymbolMutation();

  const filteredSymbols = useMemo(() => {
    return streamSymbols.filter((item) => {
      const matchesCategory =
        category === 'all' || item.category.toLowerCase() === category.toLowerCase();
      const matchesSearch =
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.finnhubSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [streamSymbols, category, searchQuery]);

  const total = filteredSymbols.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Reset page when totalPages shrinks (e.g. after delete/filter)
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
        // Stream mode's zod schema guarantees a valid EXCHANGE:SYMBOL ticker;
        // no silent fallback that could mask a missing mapping.
        finnhubSymbol: formData.finnhubSymbol.toUpperCase(),
        category: formData.category,
        description: formData.description,
        isActive: formData.isActive
      });

      success(
        'STREAM SYMBOL SAVED',
        `Symbol ${formData.symbol.toUpperCase()} has been synced to Finnhub streaming config.`
      );
      setIsAddOpen(false);
      setSelectedSymbolForEdit(null);
    } catch (err: any) {
      error('SAVE FAILED', err.message || 'Unable to save stream symbol.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!symbolToDelete) return;
    try {
      await deleteMutation.mutateAsync(symbolToDelete);
      success('SYMBOL REMOVED', `Stream symbol ${symbolToDelete} deleted.`);
      setSymbolToDelete(null);
    } catch (err: any) {
      error('DELETE FAILED', err.message || 'Unable to delete stream symbol.');
    }
  };

  return (
    <div className="space-y-3 font-mono">
      <PageHeader
        title="FINNHUB REAL-TIME STREAM SYMBOLS"
        icon={Radio}
        iconClassName={isConnected ? 'text-positive' : 'text-negative animate-pulse'}
        subtitle="Configure dynamic upstream ticker mappings for zero-latency Finnhub WebSocket ingestion"
        actions={
          <>
            <button
              onClick={() => refetchSymbols()}
              disabled={isSymbolsLoading || isSymbolsRefetching}
              className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh stream symbols"
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
              <span>ADD STREAM SYMBOL</span>
            </button>
          </>
        }
      />

      {/* Filter / Search Bar */}
      <FilterBar className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-0 w-full sm:min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter symbol or Finnhub ticker..."
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

      {/* Stream Symbol Table */}
      <StreamSymbolTable
        symbols={paginatedSymbols}
        priceMap={priceMap}
        isLoading={isSymbolsLoading}
        isError={isSymbolsError}
        onEdit={(sym) => {
          setSelectedSymbolForEdit({
            symbol: sym.symbol,
            description: sym.description || '',
            category: sym.category,
            finnhubSymbol: sym.finnhubSymbol,
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
        totalLabel="TOTAL STREAM SYMBOLS"
        isLoading={isSymbolsLoading}
      />

      {/* Add / Edit Symbol Modal */}
      {isAddOpen && (
        <SymbolModal
          isOpen={isAddOpen}
          mode="stream"
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
        title="DELETE STREAM SYMBOL"
        description={`Are you sure you want to permanently remove "${symbolToDelete}" from real-time streaming?`}
        targetIdentifier={symbolToDelete || ''}
        confirmButtonText="DELETE SYMBOL"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
