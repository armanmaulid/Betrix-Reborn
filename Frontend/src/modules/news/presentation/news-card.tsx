import React from 'react';
import { ExternalLink, Clock, Globe, Trash2 } from 'lucide-react';
import { formatUtcNewsDate } from '@/shared/utils/formatters';
import type { NewsArticle } from '@/modules/news/domain/entities/NewsArticle';

export interface NewsCardProps {
  article: NewsArticle;
  selectedTag?: string;
  onSelectTag: (tag: string) => void;
  onSelectArticle: (article: NewsArticle) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onDelete?: (article: NewsArticle) => void;
}

export function NewsCard({
  article,
  selectedTag,
  onSelectTag,
  onSelectArticle,
  isSelected = false,
  onToggleSelect,
  onDelete
}: NewsCardProps) {
  return (
    <div
      onClick={() => onSelectArticle(article)}
      className={`border bg-surface p-4 flex flex-col justify-between transition-colors cursor-pointer group space-y-3 ${
        isSelected
          ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
          : 'border-border hover:border-accent/60'
      }`}
    >
      <div>
        {/* Source, Selection Checkbox & Date Header */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
          <div className="flex items-center gap-2">
            {onToggleSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleSelect(article.id)}
                className="cursor-pointer accent-accent h-3.5 w-3.5 rounded border border-border bg-surface"
                aria-label={`Select article ${article.headline}`}
              />
            )}
            <span className="flex items-center gap-1 font-bold text-accent">
              <Globe className="w-3 h-3 text-accent" />
              {article.source.toUpperCase()}
            </span>
          </div>
          <span className="flex items-center gap-1 tabular-nums">
            <Clock className="w-2.5 h-2.5" />
            {formatUtcNewsDate(article.datetime)}
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-xs font-bold text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-snug">
          {article.headline}
        </h2>

        {/* Summary */}
        <p className="text-[11px] text-muted-foreground/80 line-clamp-3 mt-2 leading-relaxed">
          {article.summary || 'No detailed preview available for this release.'}
        </p>
      </div>

      {/* Footer Tags, Link & Delete */}
      <div className="border-t border-border/60 pt-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {article.tags.slice(0, 3).map((t) => (
            <button
              key={t}
              onClick={(e) => {
                e.stopPropagation();
                onSelectTag(t);
              }}
              className={`px-1.5 py-0.5 text-[9px] font-bold border uppercase transition-colors cursor-pointer ${
                selectedTag === t
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-border bg-black hover:border-accent hover:text-accent text-muted-foreground'
              }`}
            >
              #{t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-accent p-1 transition-colors"
            title="Open Upstream Article Source"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(article);
              }}
              className="text-muted-foreground hover:text-negative p-1 transition-colors cursor-pointer"
              title="Delete Article"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
