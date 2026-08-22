'use client';

import React from 'react';
import { FileCode, Copy, Check } from 'lucide-react';
import { useCopyFeedback } from '@/shared/presentation/hooks/use-copy-feedback';
import { TerminalModal } from '@/shared/presentation/ui/terminal-modal';

interface JsonTreeViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, unknown> | null | undefined;
}

export function JsonTreeViewer({ isOpen, onClose, title, data }: JsonTreeViewerProps) {
  const { isCopied, copy } = useCopyFeedback();

  if (!isOpen) return null;

  const jsonString = data ? JSON.stringify(data, null, 2) : '{}';

  const handleCopy = () => {
    copy(jsonString, 'json');
  };

  const footer = (
    <>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground px-3 py-1 text-xs transition-colors font-mono"
      >
        {isCopied('json') ? (
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
        className="px-4 py-1 text-xs font-bold bg-accent text-black hover:bg-accent/90 transition-colors font-mono"
      >
        CLOSE
      </button>
    </>
  );

  return (
    <TerminalModal
      isOpen={isOpen}
      onClose={onClose}
      title={`AUDIT METADATA INSPECTOR // [${title}]`}
      icon={FileCode}
      variant="accent"
      maxWidth="2xl"
      footer={footer}
    >
      {/* Code Content Viewport */}
      <div className="p-4 bg-black">
        <pre className="text-xs text-foreground font-mono leading-relaxed whitespace-pre-wrap break-all select-all">
          {jsonString}
        </pre>
      </div>
    </TerminalModal>
  );
}

