'use client';

import React, { useState } from 'react';
import { FileCode, X, Copy, Check } from 'lucide-react';

interface JsonTreeViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, unknown> | null | undefined;
}

export function JsonTreeViewer({ isOpen, onClose, title, data }: JsonTreeViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonString = data ? JSON.stringify(data, null, 2) : '{}';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl border-2 border-accent bg-surface shadow-2xl font-mono flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-accent/10 border-b border-accent/30 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-accent">
            <FileCode className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">
              AUDIT METADATA INSPECTOR // [{title}]
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Code Content Viewport */}
        <div className="p-4 overflow-y-auto flex-1 bg-black">
          <pre className="text-xs text-foreground font-mono leading-relaxed whitespace-pre-wrap break-all select-all">
            {jsonString}
          </pre>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-surface px-4 py-2.5 flex items-center justify-between shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground px-3 py-1 text-xs transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-positive" />
                <span className="text-positive font-bold">COPIED TO CLIPBOARD</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>COPY RAW JSON</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1 text-xs font-bold bg-accent text-black hover:bg-accent/90 transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
