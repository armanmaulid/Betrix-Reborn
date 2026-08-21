'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, RefreshCw, ArrowLeft } from 'lucide-react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Terminal runtime exception intercepted:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-mono">
      <div className="w-full max-w-lg border-2 border-negative bg-surface shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-2 text-negative border-b border-negative/30 pb-3">
          <ShieldAlert className="w-5 h-5 animate-pulse" />
          <h1 className="text-sm font-bold tracking-widest uppercase">
            RUNTIME EXCEPTION // CIRCUIT BREAKER TRIPPED
          </h1>
        </div>

        {/* Error Details */}
        <div className="space-y-3 text-xs leading-relaxed">
          <p className="text-foreground">
            An unexpected error occurred during terminal rendering or data synchronization.
          </p>
          <div className="bg-black border border-border p-3 text-[11px] text-negative font-mono whitespace-pre-wrap break-all">
            {error.message || 'Unknown runtime exception'}
            {error.digest && (
              <div className="text-[10px] text-muted-foreground mt-2">
                DIGEST: {error.digest}
              </div>
            )}
          </div>
        </div>

        {/* Recovery Controls */}
        <div className="pt-2 flex items-center justify-between border-t border-border/60">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border bg-black transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>DASHBOARD</span>
          </Link>

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
  );
}
