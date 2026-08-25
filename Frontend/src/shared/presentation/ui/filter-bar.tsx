'use client';

import React from 'react';

export interface FilterBarProps {
  children: React.ReactNode;
  /**
   * Extra layout classes for multi-row bars (e.g. 'space-y-3'). Colour and
   * padding are fixed by the house style and cannot be overridden.
   */
  className?: string;
}

/** Standard dark filter strip under the page header. */
export function FilterBar({ children, className = '' }: FilterBarProps) {
  return <div className={`border border-border bg-black p-3 ${className}`}>{children}</div>;
}
