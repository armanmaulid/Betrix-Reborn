'use client';

import React from 'react';
import { Activity, X } from 'lucide-react';
import { PgPoolCard } from './cards/pg-pool-card';
import { RedisStoreCard } from './cards/redis-store-card';
import { WorkersCard } from './cards/workers-card';
import { StreamGatewayCard } from './cards/stream-gateway-card';
import { BackendRuntimeCard } from './cards/backend-runtime-card';

interface TelemetryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelemetryDrawer = React.memo(function TelemetryDrawer({
  isOpen,
  onClose
}: TelemetryDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay for outside click to dismiss */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] transition-opacity"
      />

      {/* Interactive System Telemetry Slide-Up Drawer */}
      <div
        role="dialog"
        aria-label="System Telemetry Drawer"
        className="fixed bottom-7 inset-x-0 bg-black/95 backdrop-blur border-t border-accent/40 shadow-2xl z-40 p-4 font-mono text-xs animate-in slide-in-from-bottom-2 duration-150"
      >
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-border/80 pb-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-accent animate-pulse" />
              <h3 className="text-xs font-bold tracking-wider text-accent uppercase">
                CENTRALIZED INFRASTRUCTURE & TELEMETRY HUB
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex items-center space-x-1 border border-border bg-surface px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-accent transition-colors"
              title="Close Telemetry Drawer"
            >
              <X className="w-3.5 h-3.5" />
              <span>CLOSE [ESC]</span>
            </button>
          </div>

          {/* Telemetry Metrics 5-Quadrant Grid of Isolated Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <PgPoolCard />
            <RedisStoreCard />
            <WorkersCard onClose={onClose} />
            <StreamGatewayCard onClose={onClose} />
            <BackendRuntimeCard />
          </div>
        </div>
      </div>
    </>
  );
});
