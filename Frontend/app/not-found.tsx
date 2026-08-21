import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
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
  ArrowLeft,
  Terminal
} from 'lucide-react';

const DIRECTORY_ROUTES = [
  { num: '01', name: 'OPERATIONS DASHBOARD', href: '/dashboard', icon: LayoutDashboard },
  { num: '02', name: 'USER MANAGEMENT', href: '/users', icon: Users },
  { num: '03', name: 'CREDIT VOUCHERS', href: '/vouchers', icon: Ticket },
  { num: '04', name: 'AI AGENTS CATALOG', href: '/agents', icon: Bot },
  { num: '05', name: 'FINNHUB NEWS FEED', href: '/news', icon: Newspaper },
  { num: '06', name: 'MARKET CATALOG', href: '/market-data', icon: Layers },
  { num: '07', name: 'STREAM SYMBOLS', href: '/stream-symbols', icon: Activity },
  { num: '08', name: 'BROADCAST MESSENGER', href: '/broadcast', icon: Radio },
  { num: '09', name: 'SYSTEM AUDIT LOGS', href: '/audit-logs', icon: ShieldAlert },
  { num: '10', name: 'MAINTENANCE & WORKERS', href: '/maintenance', icon: Wrench }
];

export default function NotFound() {
  return (
    <div className="min-h-screen w-screen bg-background text-foreground flex items-center justify-center p-4 font-mono select-none">
      <div className="border-2 border-accent max-w-3xl w-full bg-surface p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Top Header */}
        <div className="border-b border-border/80 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 bg-negative inline-block animate-ping"></span>
            <span className="text-xs font-bold text-accent tracking-widest uppercase">
              BETRIX FINANCIAL TERMINAL // ERROR 404
            </span>
          </div>
          <span className="text-[10px] text-negative font-bold border border-negative/40 bg-negative/10 px-2 py-0.5">
            ERR_ROUTE_NOT_FOUND
          </span>
        </div>

        {/* ASCII Error Glitch Banner */}
        <div className="border border-border/60 bg-black p-4 text-center overflow-x-auto">
          <pre className="text-negative text-[9px] sm:text-[11px] leading-tight font-bold tracking-tight inline-block text-left">
{` ███████╗██████╗ ██████╗  ██████╗ ██████╗     ██╗  ██╗ ██████╗ ██╗  ██╗
 ██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔══██╗    ██║  ██║██╔═████╗██║  ██║
 █████╗  ██████╔╝██████╔╝██║   ██║██████╔╝    ███████║██║██╔██║███████║
 ██╔══╝  ██╔══██╗██╔══██╗██║   ██║██╔══██╗    ╚════██║████╔╝██║╚════██║
 ███████╗██║  ██║██║  ██║╚██████╔╝██║  ██║         ██║╚██████╔╝     ██║
 ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝         ╚═╝ ╚═════╝      ╚═╝`}
          </pre>
        </div>

        {/* Diagnostic System Info */}
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2 text-negative">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="uppercase">UNRECOGNIZED ROUTING PATH:</strong>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                The requested URL path does not match any authenticated administrative console or trading telemetry directory.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Return Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-accent text-black px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-accent/80 transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>[01] RETURN TO TERMINAL DASHBOARD</span>
          </Link>
        </div>

        {/* Quick Directory Jump Table */}
        <div className="space-y-2 pt-4 border-t border-border/80">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
            <Terminal className="w-3 h-3 text-accent" />
            <span>AVAILABLE OPERATIONAL DIRECTORIES:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {DIRECTORY_ROUTES.map((route) => {
              const Icon = route.icon;
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className="flex items-center gap-2 border border-border/80 bg-black p-2 text-[11px] text-muted-foreground hover:text-accent hover:border-accent transition-colors group"
                >
                  <span className="text-[9px] text-accent/80 font-bold">[{route.num}]</span>
                  <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent" />
                  <span className="truncate">{route.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/40 pt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>HOST: BETRIX NODE TERMINAL</span>
          <span>PROTOCOL: NEXT.JS 16 APPRUNTIME</span>
        </div>
      </div>
    </div>
  );
}
