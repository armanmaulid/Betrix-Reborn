'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Newspaper,
  RefreshCw,
  Search,
  ExternalLink,
  Tag,
  Clock,
  Globe,
  Flame,
  LayoutGrid,
  List,
  ArrowUpDown,
  Trash2,
  CheckSquare
} from 'lucide-react';
import {
  useNewsQuery,
  usePollNewsMutation,
  useDeleteNewsMutation,
  useBatchDeleteNewsMutation
} from '@/modules/news/application/queries/use-news';
import { NewsCard } from './news-card';
import { NewsListTable } from './news-list-table';
import { PageHeader } from '@/shared/presentation/ui/page-header';
import { FilterBar } from '@/shared/presentation/ui/filter-bar';
import { PaginationBar } from '@/shared/presentation/ui/pagination-bar';

import { DestructiveConfirmDialog } from '@/shared/presentation/ui/destructive-confirm-dialog';
import { TerminalModal } from '@/shared/presentation/ui/terminal-modal';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { formatFinancialNumber } from '@/shared/utils';
import { formatUtcNewsDate } from '@/shared/utils/formatters';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import type { NewsArticle } from '@news/domain/entities/NewsArticle';

const CATEGORIES = [
  { id: 'all', label: 'ALL NEWS' },
  { id: 'general', label: 'GENERAL & MACRO' },
  { id: 'forex', label: 'FOREX & FX' },
  { id: 'crypto', label: 'CRYPTO & DIGITAL' },
  { id: 'merger', label: 'MERGERS & M&A' }
];

const POPULAR_TAGS = [
  { id: 'usd', label: 'USD' },
  { id: 'eur', label: 'EUR' },
  { id: 'gbp', label: 'GBP' },
  { id: 'jpy', label: 'JPY' },
  { id: 'metal', label: 'GOLD' },
  { id: 'oil', label: 'OIL' },
  { id: 'btc', label: 'BTC' },
  { id: 'eth', label: 'ETH' },
  { id: 'indices', label: 'INDICES' },
  { id: 'global', label: 'MACRO' }
];

export function NewsContainer() {
  usePageTitle('FINANCIAL NEWS');
  const { success, error } = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [category, setCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal / Dialog states
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [articleToDelete, setArticleToDelete] = useState<NewsArticle | null>(null);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Clear selections when page/filter/search/sort changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, limit, category, selectedTag, debouncedSearch, sortOrder]);

  const {
    data,
    isLoading: isNewsLoading,
    isError: isNewsError,
    isRefetching: isNewsRefetching,
    refetch
  } = useNewsQuery({
    page,
    limit,
    category: category === 'all' ? undefined : category,
    tag: selectedTag,
    search: debouncedSearch || undefined,
    sort: sortOrder
  });

  const pollMutation = usePollNewsMutation();
  const deleteMutation = useDeleteNewsMutation();
  const batchDeleteMutation = useBatchDeleteNewsMutation();

  const articles = useMemo(() => data?.data || [], [data?.data]);
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

  const isAllSelected = useMemo(() => {
    if (articles.length === 0) return false;
    return articles.every((a) => selectedIds.has(a.id));
  }, [articles, selectedIds]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(articles.map((a) => a.id));
      setSelectedIds(allIds);
    }
  };

  const handleToggleSort = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    setPage(1);
  };

  const handlePollNow = async () => {
    try {
      await pollMutation.mutateAsync(category === 'all' ? 'general' : category);
      success('POLL TRIGGERED', 'Finnhub upstream news crawler triggered successfully.');
    } catch (err: any) {
      error('POLL FAILED', err.message || 'Unable to trigger manual news poll.');
    }
  };

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(undefined);
      setPage(1);
    } else {
      setSelectedTag(tag);
      setPage(1);
    }
  };

  const handleDeleteSingleConfirm = async () => {
    if (!articleToDelete) return;
    try {
      await deleteMutation.mutateAsync(articleToDelete.id);
      success('ARTICLE REMOVED', `Article "${articleToDelete.headline.slice(0, 40)}..." deleted.`);
      setArticleToDelete(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(articleToDelete.id);
        return next;
      });
    } catch (err: any) {
      error('DELETE FAILED', err.message || 'Unable to delete news article.');
    }
  };

  const handleBatchDeleteConfirm = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const count = await batchDeleteMutation.mutateAsync(ids);
      success('BATCH PURGE COMPLETED', `Successfully deleted ${count} selected news articles.`);
      setSelectedIds(new Set());
      setIsBatchDeleteOpen(false);
    } catch (err: any) {
      error('BATCH DELETE FAILED', err.message || 'Unable to batch delete news articles.');
    }
  };

  return (
    <div className="space-y-3 font-mono">
      <PageHeader
        title="INSTITUTIONAL FINANCIAL NEWS & HEADLINES"
        icon={Newspaper}
        subtitle="Real-time macroeconomic feeds, forex market commentary, and cryptocurrency intelligence"
        actions={
          <>
            <button
              onClick={() => refetch()}
              disabled={isNewsLoading || isNewsRefetching}
              className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh news feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isNewsRefetching ? 'animate-spin' : ''}`} />
              <span>REFRESH</span>
            </button>
            <button
              onClick={handlePollNow}
              disabled={pollMutation.isPending}
              className="flex items-center gap-1.5 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              title="Force immediate Finnhub API sync"
            >
              <Flame className={`w-3.5 h-3.5 ${pollMutation.isPending ? 'animate-pulse' : ''}`} />
              <span>{pollMutation.isPending ? 'POLLING...' : 'FORCE NEWS SYNC'}</span>
            </button>
          </>
        }
      />

      {/* Filter, Search & View Controls Bar */}
      <FilterBar className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  category === cat.id
                    ? 'border border-accent bg-accent/20 text-accent'
                    : 'border border-border bg-surface hover:bg-surface-hover text-muted-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Box */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search news releases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
              />
            </div>

            {/* Sort Toggle ASC / DESC */}
            <button
              onClick={handleToggleSort}
              className="flex items-center gap-1 border border-border bg-surface hover:border-accent hover:text-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap text-muted-foreground"
              title={`Toggle Sort Order (${sortOrder === 'desc' ? 'Newest First' : 'Oldest First'})`}
            >
              <ArrowUpDown className="w-3 h-3 text-accent" />
              <span>{sortOrder === 'desc' ? 'NEWEST (DESC)' : 'OLDEST (ASC)'}</span>
            </button>

            {/* View Mode Toggle (List / Grid) */}
            <div className="flex items-center border border-border bg-surface">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-accent/20 text-accent'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="List View"
                aria-label="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 transition-colors cursor-pointer border-l border-border ${
                  viewMode === 'grid'
                    ? 'bg-accent/20 text-accent'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Grid / Card View"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Popular Tag Filters & Total count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/40 text-[10px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-muted-foreground mr-1 font-bold">
              <Tag className="w-3 h-3 text-accent" />
              <span>TOPIC TAGS:</span>
            </div>

            {POPULAR_TAGS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTagClick(t.id)}
                className={`px-2 py-0.5 border text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  selectedTag === t.id
                    ? 'border-accent bg-accent text-black'
                    : 'border-border bg-surface hover:border-accent/40 text-muted-foreground'
                }`}
              >
                #{t.label}
              </button>
            ))}

            {selectedTag && (
              <button
                onClick={() => setSelectedTag(undefined)}
                className="text-negative hover:underline ml-2 text-[10px] font-bold cursor-pointer"
              >
                [CLEAR FILTER: #{selectedTag.toUpperCase()}]
              </button>
            )}
          </div>

          <div className="text-xs text-muted-foreground whitespace-nowrap">
            TOTAL:{' '}
            <strong className="text-foreground tabular-nums">{formatFinancialNumber(total)}</strong>{' '}
            ARTICLES
          </div>
        </div>
      </FilterBar>

      {/* Batch Action Toolbar (When articles are selected) */}
      {selectedIds.size > 0 && (
        <div className="border border-accent/50 bg-accent/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-accent font-bold">
            <CheckSquare className="w-4 h-4" />
            <span>{selectedIds.size} ARTICLES SELECTED</span>
            <span className="text-muted-foreground text-[11px] font-normal">
              (Page {page} of {totalPages})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-2.5 py-1 border border-border bg-black hover:border-accent hover:text-accent text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer text-muted-foreground"
            >
              {isAllSelected ? 'DESELECT ALL' : 'SELECT ALL ON PAGE'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1 border border-border bg-black hover:text-foreground text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer text-muted-foreground"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => setIsBatchDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-negative text-white hover:bg-negative/90 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DELETE SELECTED ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Content Area: List View vs Grid View */}
      {viewMode === 'list' ? (
        <NewsListTable
          articles={articles}
          isLoading={isNewsLoading}
          isError={isNewsError}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          isAllSelected={isAllSelected}
          onSelectTag={handleTagClick}
          onSelectArticle={(art) => setSelectedArticle(art)}
          onDeleteArticle={(art) => setArticleToDelete(art)}
          sortOrder={sortOrder}
          onToggleSort={handleToggleSort}
        />
      ) : /* Grid View */
      isNewsLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground animate-pulse border border-border bg-surface">
          DOWNLOADING LIVE NEWS WIRE TELEMETRY...
        </div>
      ) : isNewsError ? (
        <div className="p-8 text-center text-xs text-negative border border-negative bg-surface">
          ERROR QUERYING FINANCIAL NEWS WIRE.
        </div>
      ) : articles.length === 0 ? (
        <div className="p-12 text-center text-xs text-muted-foreground border border-dashed border-border/80">
          NO NEWS ARTICLES MATCHING YOUR CURRENT FILTERS. CLICK "FORCE NEWS SYNC" TO RETRIEVE FRESH
          ARTICLES.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              selectedTag={selectedTag}
              onSelectTag={handleTagClick}
              onSelectArticle={(art) => setSelectedArticle(art)}
              isSelected={selectedIds.has(article.id)}
              onToggleSelect={handleToggleSelect}
              onDelete={(art) => setArticleToDelete(art)}
            />
          ))}
        </div>
      )}

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
        totalLabel="TOTAL ARTICLES"
        isLoading={isNewsLoading}
      />

      {/* Article Detail Preview Modal */}
      {selectedArticle && (
        <TerminalModal
          isOpen={Boolean(selectedArticle)}
          onClose={() => setSelectedArticle(null)}
          title="FINANCIAL NEWS ARTICLE DETAILS"
          icon={Newspaper}
          variant="accent"
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] text-muted-foreground tabular-nums">
                ID: {selectedArticle.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const art = selectedArticle;
                    setSelectedArticle(null);
                    setArticleToDelete(art);
                  }}
                  className="px-3 py-1.5 border border-border bg-black hover:border-negative hover:text-negative text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-muted-foreground flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>DELETE</span>
                </button>
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-accent bg-accent text-black hover:bg-accent/90 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>READ ORIGINAL SOURCE</span>
                </a>
              </div>
            </div>
          }
        >
          <div className="p-5 space-y-4">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-bold text-accent border border-accent/30 bg-accent/10 px-2 py-0.5">
                  <Globe className="w-3 h-3" />
                  {selectedArticle.source.toUpperCase()}
                </span>
                <span className="border border-border bg-black px-2 py-0.5 uppercase font-bold text-[10px]">
                  {selectedArticle.category}
                </span>
              </div>
              <span className="flex items-center gap-1 tabular-nums">
                <Clock className="w-3 h-3 text-accent" />
                {formatUtcNewsDate(selectedArticle.datetime)}
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-sm font-bold text-foreground leading-snug">
              {selectedArticle.headline}
            </h2>

            {/* Summary */}
            <div className="border border-border bg-black p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {selectedArticle.summary || 'No detailed body text provided by upstream vendor.'}
            </div>

            {/* Tags */}
            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <div className="text-[10px] text-muted-foreground font-bold uppercase">
                  TOPIC TAGS:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedArticle.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 text-[10px] font-bold border border-border bg-surface text-accent uppercase"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TerminalModal>
      )}

      {/* Single Article Delete Confirmation Dialog */}
      <DestructiveConfirmDialog
        isOpen={Boolean(articleToDelete)}
        onClose={() => setArticleToDelete(null)}
        onConfirm={handleDeleteSingleConfirm}
        title="PURGE NEWS ARTICLE"
        description={`Are you sure you want to permanently delete article "${articleToDelete?.headline}" from the news database? This action is irreversible.`}
        confirmButtonText="DELETE ARTICLE"
        isLoading={deleteMutation.isPending}
      />

      {/* Batch Delete Confirmation Dialog */}
      <DestructiveConfirmDialog
        isOpen={isBatchDeleteOpen}
        onClose={() => setIsBatchDeleteOpen(false)}
        onConfirm={handleBatchDeleteConfirm}
        title="BATCH PURGE NEWS ARTICLES"
        description={`Are you sure you want to permanently delete ${selectedIds.size} selected news articles from the database? This action is irreversible.`}
        confirmButtonText={`PURGE ${selectedIds.size} ARTICLES`}
        isLoading={batchDeleteMutation.isPending}
      />
    </div>
  );
}
