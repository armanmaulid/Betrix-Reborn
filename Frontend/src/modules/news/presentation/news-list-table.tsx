'use client';

import React from 'react';
import { ExternalLink, Globe, Clock, Trash2, ArrowUpDown } from 'lucide-react';
import { formatUtcNewsDate } from '@/shared/utils/formatters';
import type { NewsArticle } from '@news/domain/entities/NewsArticle';
import { TableShell, type TableColumn } from '@/shared/presentation/ui/table-shell';
import { Badge } from '@/shared/presentation/ui/badge';

export interface NewsListTableProps {
  articles: NewsArticle[];
  isLoading: boolean;
  isError: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  onSelectTag?: (tag: string) => void;
  onSelectArticle?: (article: NewsArticle) => void;
  onDeleteArticle: (article: NewsArticle) => void;
  sortOrder?: 'asc' | 'desc';
  onToggleSort?: () => void;
}

export function NewsListTable({
  articles,
  isLoading,
  isError,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isAllSelected,
  onSelectTag,
  onSelectArticle,
  onDeleteArticle,
  sortOrder = 'desc',
  onToggleSort
}: NewsListTableProps) {
  const dateHeader = onToggleSort ? (
    <button
      type="button"
      onClick={onToggleSort}
      className="flex items-center gap-1 hover:text-accent transition-colors cursor-pointer text-[10px] uppercase tracking-wider font-bold"
      title={`Sort by Release Date (${sortOrder === 'desc' ? 'Newest First' : 'Oldest First'})`}
    >
      <Clock className="w-3 h-3 text-accent" />
      <span>RELEASE DATE (UTC)</span>
      <ArrowUpDown className="w-2.5 h-2.5 text-accent/80" />
      <span className="text-[9px] text-accent">[{sortOrder.toUpperCase()}]</span>
    </button>
  ) : (
    <span className="flex items-center gap-1">
      <Clock className="w-3 h-3 text-accent" />
      <span>RELEASE DATE (UTC)</span>
    </span>
  );

  const columns: TableColumn[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={isAllSelected && articles.length > 0}
          onChange={onToggleSelectAll}
          disabled={isLoading || articles.length === 0}
          className="cursor-pointer accent-accent h-3.5 w-3.5 rounded border border-border bg-surface"
          title="Select all on current page"
        />
      ),
      className: 'w-10 text-center'
    },
    { key: 'date', header: dateHeader, className: 'whitespace-nowrap' },
    { key: 'source', label: 'Source', className: 'whitespace-nowrap' },
    { key: 'headline', label: 'Headline & Preview', className: 'min-w-[320px]' },
    { key: 'category', label: 'Category', className: 'whitespace-nowrap' },
    { key: 'actions', label: 'Actions', align: 'right', className: 'whitespace-nowrap' }
  ];

  return (
    <TableShell
      columns={columns}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && !isError && articles.length === 0}
      loadingMessage="RETRIEVING LIVE FINANCIAL NEWS TELEMETRY..."
      errorMessage="ERROR QUERYING FINANCIAL NEWS WIRE."
      emptyMessage="NO NEWS ARTICLES MATCHING YOUR CURRENT FILTERS."
      wrapperClassName="font-mono"
    >
      {articles.map((article) => {
        const isSelected = selectedIds.has(article.id);
        return (
          <tr
            key={article.id}
            className={`transition-colors ${
              isSelected ? 'bg-accent/10 hover:bg-accent/15' : 'hover:bg-surface-hover/80'
            }`}
          >
            {/* Selection Checkbox */}
            <td className="p-3 text-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(article.id)}
                className="cursor-pointer accent-accent h-3.5 w-3.5 rounded border border-border bg-surface"
                aria-label={`Select article ${article.headline}`}
              />
            </td>

            {/* Release Date */}
            <td className="p-3 whitespace-nowrap tabular-nums text-muted-foreground text-[11px]">
              {formatUtcNewsDate(article.datetime)}
            </td>

            {/* Source */}
            <td className="p-3 whitespace-nowrap">
              <span className="inline-flex items-center gap-1 font-bold text-[10px] text-accent border border-accent/30 bg-accent/10 px-1.5 py-0.5">
                <Globe className="w-2.5 h-2.5" />
                {article.source.toUpperCase()}
              </span>
            </td>

            {/* Headline, Summary, Tags */}
            <td className="p-3">
              <div
                onClick={() => onSelectArticle && onSelectArticle(article)}
                className="font-bold text-foreground hover:text-accent transition-colors cursor-pointer leading-snug"
              >
                {article.headline}
              </div>
              {article.summary && (
                <div className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-1">
                  {article.summary}
                </div>
              )}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {article.tags.slice(0, 4).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectTag) onSelectTag(t);
                      }}
                      className="px-1.5 py-0.2 text-[9px] border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors uppercase cursor-pointer"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </td>

            {/* Category */}
            <td className="p-3 whitespace-nowrap">
              <Badge tone="neutral">{article.category}</Badge>
            </td>

            {/* Actions */}
            <td className="p-3 text-right whitespace-nowrap">
              <div className="flex items-center justify-end gap-1.5">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors cursor-pointer"
                  title="Open Upstream Article Source"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => onDeleteArticle(article)}
                  className="p-1 border border-border bg-black hover:border-negative hover:text-negative text-muted-foreground transition-colors cursor-pointer"
                  title="Delete News Article"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </td>
          </tr>
        );
      })}
    </TableShell>
  );
}
