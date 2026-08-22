'use client';

import React from 'react';
import { formatFinancialNumber } from '@/shared/utils';

export interface IntervalOption<T extends string = string> {
  key: T;
  label: string;
  shortLabel?: string;
  value: number;
  description: string;
}

export interface IntervalStatCardProps<T extends string = string> {
  title: string;
  icon: React.ElementType;
  options: IntervalOption<T>[];
  selectedInterval: T;
  onSelectInterval: (interval: T) => void;
  colorScheme?: 'positive' | 'info' | 'accent';
  prefix?: string;
  className?: string;
}

export function IntervalStatCard<T extends string = string>({
  title,
  icon: Icon,
  options,
  selectedInterval,
  onSelectInterval,
  colorScheme = 'positive',
  prefix = '',
  className = ''
}: IntervalStatCardProps<T>) {
  const selectedOption =
    options.find((opt) => opt.key === selectedInterval) || options[0];

  const colorStyles = {
    positive: {
      icon: 'text-positive',
      hoverBorder: 'hover:border-positive/40',
      activeTab: 'bg-positive/20 text-positive',
      value: 'text-positive',
      activeChip: 'border-positive/50 bg-positive/10 text-positive font-bold'
    },
    info: {
      icon: 'text-info',
      hoverBorder: 'hover:border-info/40',
      activeTab: 'bg-info/20 text-info',
      value: 'text-info',
      activeChip: 'border-info/50 bg-info/10 text-info font-bold'
    },
    accent: {
      icon: 'text-accent',
      hoverBorder: 'hover:border-accent/40',
      activeTab: 'bg-accent/20 text-accent',
      value: 'text-accent',
      activeChip: 'border-accent/50 bg-accent/10 text-accent font-bold'
    }
  }[colorScheme];

  return (
    <div
      className={`border border-border bg-surface p-4 flex flex-col justify-between space-y-3 ${colorStyles.hoverBorder} transition-colors font-mono select-none ${className}`}
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
            <Icon className={`w-3.5 h-3.5 ${colorStyles.icon}`} />
            <span>{title}</span>
          </div>

          {/* Interval Switcher Tabs */}
          <div className="flex items-center gap-0.5 border border-border/80 bg-black p-0.5 text-[9px]">
            {options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => onSelectInterval(opt.key)}
                className={`px-1.5 py-0.5 font-bold transition-colors uppercase ${
                  selectedInterval === opt.key
                    ? colorStyles.activeTab
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.shortLabel || opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Value Display */}
        <div className={`text-2xl font-bold ${colorStyles.value} mt-2 tabular-nums`}>
          {prefix}
          {formatFinancialNumber(selectedOption ? selectedOption.value : 0)}
        </div>
        <div className="text-[9px] text-muted-foreground mt-0.5">
          {selectedOption ? selectedOption.description : ''}
        </div>
      </div>

      {/* Sub-breakdown chips */}
      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-border/50 text-[9px]">
        {options.map((opt) => {
          const isSelected = selectedInterval === opt.key;
          return (
            <div
              key={opt.key}
              onClick={() => onSelectInterval(opt.key)}
              className={`p-1 border cursor-pointer transition-colors ${
                isSelected
                  ? colorStyles.activeChip
                  : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              <div className="text-[8px] uppercase">{opt.shortLabel || opt.label}</div>
              <div className="tabular-nums font-bold">
                {prefix}
                {formatFinancialNumber(opt.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
