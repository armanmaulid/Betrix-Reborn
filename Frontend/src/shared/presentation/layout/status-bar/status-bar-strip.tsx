'use client';

import React from 'react';
import { ApiStatusItem } from './items/api-status-item';
import { StreamStatusItem } from './items/stream-status-item';
import { PgPoolItem } from './items/pg-pool-item';
import { RedisStatusItem } from './items/redis-status-item';
import { WorkersStatusItem } from './items/workers-status-item';
import { SessionsStatusItem } from './items/sessions-status-item';
import { AuthStatusItem } from './items/auth-status-item';
import { HostEnvItem } from './items/host-env-item';
import { UptimeItem } from './items/uptime-item';
import { UtcClockItem } from './items/utc-clock-item';
import { TelemetryToggleItem } from './items/telemetry-toggle-item';

interface StatusBarStripProps {
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
}

export const StatusBarStrip = React.memo(function StatusBarStrip({
  isDrawerOpen,
  onToggleDrawer
}: StatusBarStripProps) {
  return (
    <footer className="min-h-7 pointer-coarse:min-h-11 border-t border-border bg-black px-3 pb-safe flex items-center justify-between font-mono text-[10px] select-none shrink-0 z-30">
      {/* Left Section: Live Gateway, Stream, Resources & Operational Status (Hierarchical P0 -> P2) */}
      <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar py-0.5">
        {/* 1. API Health & Latency (P0 - Critical Gateway) */}
        <ApiStatusItem />

        <span className="text-border">|</span>

        {/* 2. Stream Gateway (P0 - Market Data Stream) */}
        <StreamStatusItem />

        <span className="text-border hidden sm:inline">|</span>

        {/* 3. Database Connection Pool (P1 - Resource Health) */}
        <PgPoolItem />

        <span className="text-border hidden sm:inline">|</span>

        {/* 4. Redis In-Memory Cache Store (P1 - Cache Health) */}
        <RedisStatusItem />

        <span className="text-border hidden md:inline">|</span>

        {/* 5. Background Workers (P1 - Pipelines) */}
        <WorkersStatusItem />

        <span className="text-border hidden lg:inline">|</span>

        {/* 6. Active User Workload / Sessions (P2 - Workload) */}
        <SessionsStatusItem />

        <span className="text-border hidden xl:inline">|</span>

        {/* 7. Security & Auth Guard (P2 - Security Perimeter) */}
        <AuthStatusItem />

        <span className="text-border hidden 2xl:inline">|</span>

        {/* 8. Host Environment (P2 - Runtime Environment) */}
        <HostEnvItem />
      </div>

      {/* Right Section: Uptime, Live UTC Clock & Telemetry Drawer (P3 - Utility & Drill-down) */}
      <div className="flex items-center space-x-3 shrink-0 ml-2">
        {/* 9. Backend Process Uptime */}
        <UptimeItem />

        <span className="text-border hidden lg:inline">|</span>

        {/* 10. High-Precision UTC Clock */}
        <UtcClockItem />

        <span className="text-border">|</span>

        {/* 11. Expand Telemetry Drawer Toggle Button */}
        <TelemetryToggleItem isOpen={isDrawerOpen} onToggle={onToggleDrawer} />
      </div>
    </footer>
  );
});
