'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Ticket,
  Bot,
  ShieldAlert,
  Radio,
  Wrench,
  Newspaper,
  Layers,
  Activity,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface SidebarNavItem {
  num: string;
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export const NAV_ITEMS: SidebarNavItem[] = [
  { num: '01', name: 'DASHBOARD', href: '/dashboard', icon: LayoutDashboard },
  { num: '02', name: 'USER MANAGEMENT', href: '/users', icon: Users },
  { num: '03', name: 'CREDIT VOUCHERS', href: '/vouchers', icon: Ticket },
  { num: '04', name: 'AI AGENTS', href: '/agents', icon: Bot },
  { num: '05', name: 'FINNHUB NEWS', href: '/news', icon: Newspaper },
  { num: '06', name: 'MARKET CATALOG', href: '/market-data', icon: Layers },
  { num: '07', name: 'STREAM SYMBOLS', href: '/stream-symbols', icon: Activity },
  { num: '08', name: 'BROADCAST MSG', href: '/broadcast', icon: Radio },
  { num: '09', name: 'AUDIT LOGS', href: '/audit-logs', icon: ShieldAlert },
  { num: '10', name: 'MAINTENANCE', href: '/maintenance', icon: Wrench }
];

export interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  if (isCollapsed) {
    return (
      <aside className="w-14 border-r border-border bg-black flex flex-col justify-between shrink-0 select-none transition-all duration-150">
        {/* Navrail Header */}
        <div className="py-2.5 flex flex-col items-center">
          <div className="pb-2 border-b border-border/50 w-full flex justify-center">
            <button
              onClick={onToggleCollapse}
              title="Expand Sidebar ([)"
              className="p-1.5 text-muted-foreground hover:text-accent hover:bg-surface border border-transparent hover:border-border transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>

          {/* Navrail Icons */}
          <nav className="w-full space-y-1 mt-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const currentPath = pathname || '';
              const isActive =
                currentPath === item.href ||
                (item.href !== '/dashboard' && currentPath.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={`${item.name} [${item.num}]`}
                  className={`group relative flex items-center justify-center py-2.5 font-mono text-xs transition-colors border-l-2 ${
                    isActive
                      ? 'border-accent bg-surface text-accent font-bold'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-muted-foreground group-hover:text-foreground'}`} />

                  {/* Floating Navrail Tooltip */}
                  <div className="absolute left-full ml-2 z-50 whitespace-nowrap bg-black border border-border px-2.5 py-1 text-[11px] text-foreground font-mono shadow-xl hidden group-hover:flex items-center gap-1.5 pointer-events-none">
                    <span className="text-accent font-bold">[{item.num}]</span>
                    <span className="tracking-wider">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Navrail Footer Status */}
        <div className="p-2.5 border-t border-border bg-surface/40 flex flex-col items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-positive animate-pulse" title="HOST: PROD // LIVE" />
          <button
            onClick={onToggleCollapse}
            title="Expand Sidebar ([)"
            className="p-1 text-muted-foreground hover:text-accent"
          >
            <span className="text-[9px] font-mono font-bold text-muted-foreground hover:text-accent">[EXP]</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-60 border-r border-border bg-black flex flex-col justify-between shrink-0 select-none transition-all duration-150">
      {/* Navigation Links */}
      <div className="py-3">
        <div className="px-3 pb-2 flex items-center justify-between border-b border-border/50 mb-2">
          <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
            OPERATIONAL DIRECTORY
          </span>
          <button
            onClick={onToggleCollapse}
            title="Collapse to Navrail ([)"
            className="p-1 text-muted-foreground hover:text-accent hover:bg-surface border border-transparent hover:border-border transition-colors"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>

        <nav className="space-y-0.5 px-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const currentPath = pathname || '';
            const isActive =
              currentPath === item.href ||
              (item.href !== '/dashboard' && currentPath.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between px-2.5 py-2 font-mono text-xs transition-colors border-l-2 ${
                  isActive
                    ? 'border-accent bg-surface text-accent font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/50'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className={`text-[10px] tabular-nums ${isActive ? 'text-accent' : 'text-muted-foreground/60'}`}>
                    [{item.num}]
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  <span className="tracking-wider">{item.name}</span>
                </div>

                {isActive ? (
                  <ChevronRight className="w-3 h-3 text-accent animate-pulse" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Terminal System Status Footer */}
      <div className="p-3 border-t border-border bg-surface/40 font-mono text-[10px] space-y-1 text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>HOST ENV:</span>
          <span className="text-foreground">PROD // LIVE</span>
        </div>
        <div className="flex items-center justify-between">
          <span>STACK:</span>
          <span className="text-foreground">NEXT.JS 16 / TURBO</span>
        </div>
        <div className="flex items-center justify-between">
          <span>SECURITY:</span>
          <span className="text-positive">JWT + HTTPONLY</span>
        </div>
        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[9px]">
          <span>NAVRAIL:</span>
          <button
            onClick={onToggleCollapse}
            className="text-accent hover:underline flex items-center gap-1 font-bold"
          >
            COLLAPSE [
          </button>
        </div>
      </div>
    </aside>
  );
}
