'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  /** Right-side slot — typically REFRESH / primary action buttons. */
  actions?: React.ReactNode;
}

/**
 * Standard page header card: icon + accent UPPERCASE title, optional muted
 * subtitle, and an action slot on the right. Every list/dashboard page uses
 * exactly this shape (see style audit: 12/12 pages already matched).
 */
export function PageHeader({ title, subtitle, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center space-x-2">
          {Icon ? <Icon className="w-4 h-4 text-accent" /> : null}
          <h1 className="text-sm font-bold tracking-wider text-accent uppercase">{title}</h1>
        </div>
        {subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
