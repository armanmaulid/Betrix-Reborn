'use client';

import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background">
        <div className="min-h-screen flex flex-col items-center justify-center p-4 font-mono">
          <div className="w-full max-w-lg border-2 border-negative bg-surface shadow-2xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-2 text-negative border-b border-negative/30 pb-3">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <h1 className="text-sm font-bold tracking-widest uppercase">
                FATAL EXCEPTION // ROOT CIRCUIT BREAKER
              </h1>
            </div>

            {/* Error Details */}
            <div className="space-y-3 text-xs leading-relaxed">
              <p className="text-foreground">
                A critical error occurred while booting the terminal. The issue has been logged for operators.
              </p>
              <div className="border border-border bg-black p-3 text-[11px] text-muted-foreground font-mono break-all">
                An unexpected error has occurred. Please retry the operation.
                {error.digest && (
                  <div className="text-[10px] text-muted-foreground mt-2">
                    Reference: {error.digest}
                  </div>
                )}
              </div>
            </div>

            {/* Recovery Controls */}
            <div className="pt-2 flex items-center justify-end border-t border-border/60">
              <button
                onClick={() => reset()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-accent text-black hover:bg-accent/90 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RETRY OPERATION</span>
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
