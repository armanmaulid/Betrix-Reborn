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
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { useNewsQuery, usePollNewsMutation } from '@/lib/queries/use-news';
import { useToast } from '@/components/ui/terminal-toast';
import { formatFinancialNumber } from '@/lib/utils';
import type { NewsArticle } from '@/lib/types';

const CATEGORIES = [
  { id: 'all', label: 'ALL NEWS' },
  { id: 'general', label: 'GENERAL & MACRO' },
  { id: 'forex', label: 'FOREX & FX' },
  { id: 'crypto', label: 'CRYPTO & DIGITAL' },
  { id: 'merger', label: 'MERGERS & M&A' }
];

const POPULAR_TAGS = ['USD', 'EUR', 'FED', 'INFLATION', 'RATES', 'GOLD', 'OIL', 'CRYPTO', 'EARNINGS', 'TECH'];

export default function NewsPage() {
  const { success, error } = useToast();
  const [category, setCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const {
    data: newsData,
    isLoading,
    isRefetching,
    refetch
  } = useNewsQuery({
    page,
    limit: 18,
    category: category !== 'all' ? category : undefined,
    tag: selectedTag
  });

  const pollMutation = usePollNewsMutation();

  const handleSyncNews = async () => {
    try {
      const activeCat = category !== 'all' ? category : 'general';
      const res = await pollMutation.mutateAsync(activeCat);
      success('FINNHUB SYNC COMPLETE', `Polled ${res.data?.polledCount || 0} news items for ${activeCat.toUpperCase()}.`);
      refetch();
    } catch (err: any) {
      error('FINNHUB SYNC FAILED', err.message || 'Failed to poll news.');
    }
  };

  const filteredArticles = (newsData?.data || []).filter((article) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      article.headline.toLowerCase().includes(q) ||
      article.summary.toLowerCase().includes(q) ||
      article.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const formatArticleTime = (timestamp: number) => {
    if (!timestamp) return 'UNKNOWN';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' UTC';
  };

  return (
    <div className="space-y-6 font-mono max-w-7xl mx-auto">
      {/* 1. Header Titlebar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Newspaper className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              FINNHUB FINANCIAL NEWS INTELLIGENCE FEED
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated ingestion from Finnhub API via backend background worker (<code className="text-accent">finnhub-news-poller</code>)
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 border border-border bg-black px-2.5 py-1 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-positive inline-block animate-pulse"></span>
            <span>BACKEND INGESTION: AUTOMATIC (15S)</span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center space-x-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1 font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>SYNC VIEW</span>
          </button>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="border border-border bg-surface p-4 space-y-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategory(cat.id);
                setPage(1);
              }}
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

        {/* Search & Tag Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="SEARCH HEADLINES OR CONTENT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-border pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>

          {/* Quick Tag Pills */}
          <div className="flex flex-wrap items-center gap-1 text-[10px] w-full md:w-auto">
            <span className="text-muted-foreground uppercase flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-accent" />
              TAGS:
            </span>
            {POPULAR_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setSelectedTag(selectedTag === t ? undefined : t);
                  setPage(1);
                }}
                className={`px-2 py-0.5 border font-mono transition-colors ${
                  selectedTag === t
                    ? 'border-positive bg-positive/20 text-positive font-bold'
                    : 'border-border/60 bg-black text-muted-foreground hover:text-foreground'
                }`}
              >
                #{t}
              </button>
            ))}
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(undefined)}
                className="px-2 py-0.5 text-negative hover:underline ml-1"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Articles Grid */}
      {isLoading ? (
        <div className="border border-border bg-surface p-12 text-center text-xs text-muted-foreground animate-pulse">
          FETCHING FINNHUB INTELLIGENCE FEED...
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="border border-border bg-surface p-12 text-center text-xs text-muted-foreground space-y-3">
          <Newspaper className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="uppercase font-bold tracking-wider">NO NEWS ARTICLES FOUND IN THIS VIEW</p>
          <p className="text-[11px]">Try selecting a different category or click "POLL FINNHUB NOW" to fetch new stories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              className="border border-border bg-surface hover:border-accent/60 transition-all flex flex-col justify-between p-4 space-y-3 group"
            >
              <div className="space-y-2">
                {/* Meta Header */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-accent border border-accent/30 bg-accent/10 px-1.5 py-0.2">
                      {article.source.toUpperCase()}
                    </span>
                    <span className="uppercase text-[9px] text-muted-foreground">
                      {article.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px]">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatArticleTime(article.datetime)}</span>
                  </div>
                </div>

                {/* Headline */}
                <h3 className="text-xs font-bold text-foreground line-clamp-2 group-hover:text-accent transition-colors leading-snug">
                  {article.headline}
                </h3>

                {/* Summary */}
                <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
                  {article.summary || 'No summary text provided by source provider.'}
                </p>
              </div>

              {/* Tags & Action */}
              <div className="pt-2 border-t border-border/40 space-y-2">
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {article.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1.5 py-0.2 border border-border/60 bg-black text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedArticle(article)}
                    className="text-[10px] text-accent hover:underline uppercase font-bold"
                  >
                    [QUICK VIEW]
                  </button>

                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border/80 bg-black px-2 py-0.5 transition-colors"
                  >
                    <span>SOURCE</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Pagination Footer */}
      {newsData?.meta && newsData.meta.totalPages > 1 && (
        <div className="border border-border bg-surface p-3 flex items-center justify-between text-xs">
          <div className="text-muted-foreground text-[11px]">
            TOTAL STORIES: <span className="text-foreground font-bold">{formatFinancialNumber(newsData.meta.total)}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center space-x-1 border border-border bg-black px-2.5 py-1 text-xs hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>PREV</span>
            </button>

            <span className="text-xs text-muted-foreground px-2">
              PAGE {page} OF {newsData.meta.totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(newsData.meta.totalPages, p + 1))}
              disabled={page >= newsData.meta.totalPages}
              className="flex items-center space-x-1 border border-border bg-black px-2.5 py-1 text-xs hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
            >
              <span>NEXT</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border-2 border-accent bg-surface max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-accent border border-accent/40 bg-accent/10 px-2 py-0.5">
                  {selectedArticle.source.toUpperCase()} // {selectedArticle.category.toUpperCase()}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatArticleTime(selectedArticle.datetime)}
                </span>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-xs text-muted-foreground hover:text-foreground border border-border px-2 py-0.5"
              >
                [ESC / CLOSE]
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-foreground leading-snug">
                {selectedArticle.headline}
              </h2>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedArticle.summary || 'No full summary available.'}
              </p>

              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {selectedArticle.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 border border-border bg-black text-accent"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">ID: {selectedArticle.id}</span>
              <div className="flex items-center gap-3">
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-accent text-black px-4 py-1.5 hover:bg-accent/80 transition-colors"
                >
                  <span>OPEN ORIGINAL SOURCE</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
