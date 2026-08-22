'use client';

import React, { useState } from 'react';
import {
  Newspaper,
  RefreshCw,
  Search,
  ExternalLink,
  Tag,
  Clock,
  Globe,
  Flame,
  Filter
} from 'lucide-react';
import { useNewsQuery, usePollNewsMutation } from '@/modules/news/application/queries/use-news';
import { useWorkersQuery } from '@/modules/operations/application/queries/use-workers';
import { NewsCard } from './news-card';
import { PaginationBar } from '@/shared/presentation/ui/pagination-bar';
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
  const [category, setCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const {
    data,
    isLoading: isNewsLoading,
    isError: isNewsError,
    isRefetching: isNewsRefetching,
    refetch
  } = useNewsQuery({
    page,
    limit: 12,
    category: category === 'all' ? undefined : category,
    tag: selectedTag,
    search: debouncedSearch || undefined
  });

  const pollMutation = usePollNewsMutation();
  const { data: workers = [] } = useWorkersQuery(5000);
  const newsWorker = workers.find((w) => w.id === 'news-worker' || w.category === 'news');

  const articles = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

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
    } else {
      setSelectedTag(tag);
      setPage(1);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header Bar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Newspaper className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              INSTITUTIONAL FINANCIAL NEWS & HEADLINES
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time macroeconomic feeds, forex market commentary, and cryptocurrency intelligence
          </p>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="border border-border bg-black p-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

          <div className="relative min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search news releases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Popular Tag Filters */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/40 text-[10px]">
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
      </div>

      {/* Grid Content */}
      {isNewsLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground animate-pulse border border-border bg-surface">
          DOWNLOADING LIVE NEWS WIRE TELEMETRY...
        </div>
      ) : isNewsError ? (
        <div className="p-8 text-center text-xs text-negative border border-negative bg-surface">
          ERROR QUERYING FINANCIAL NEWS WIRE.
        </div>
      ) : articles.length === 0 ? (
        <div className="p-12 text-center text-xs text-muted-foreground border border-dashed border-border/80">
          NO NEWS ARTICLES MATCHING YOUR CURRENT FILTERS. CLICK "FORCE NEWS SYNC" TO RETRIEVE FRESH ARTICLES.
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
            />
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      <PaginationBar
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        limit={12}
        isLoading={isNewsLoading}
      />
    </div>
  );
}
