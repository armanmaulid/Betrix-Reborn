import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  LayoutDashboard
} from 'lucide-react';

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

        {/* Footer */}
        <div className="border-t border-border/40 pt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>HOST: BETRIX NODE TERMINAL</span>
          <span>PROTOCOL: NEXT.JS 16 APPRUNTIME</span>
        </div>
      </div>
    </div>
  );
}
