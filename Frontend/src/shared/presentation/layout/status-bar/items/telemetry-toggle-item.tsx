'use client';

import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TelemetryToggleItemProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const TelemetryToggleItem = React.memo(function TelemetryToggleItem({
  isOpen,
  onToggle
}: TelemetryToggleItemProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center space-x-1 border border-border bg-surface hover:border-accent hover:text-accent text-muted-foreground px-1.5 py-0.5 transition-colors font-bold uppercase"
      title="Toggle Live System Telemetry Hub"
    >
      {isOpen ? (
        <>
          <ChevronDown className="w-3 h-3 text-accent" />
          <span className="text-[9px]">COLLAPSE</span>
        </>
      ) : (
        <>
          <ChevronUp className="w-3 h-3 text-accent" />
          <span className="text-[9px]">TELEMETRY</span>
        </>
      )}
    </button>
  );
});
