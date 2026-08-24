'use client';

import React, { useState, useEffect } from 'react';
import { AlertOctagon } from 'lucide-react';
import { TerminalModal } from './terminal-modal';

export interface DestructiveConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  targetIdentifier?: string;
  confirmButtonText?: string;
  isLoading?: boolean;
}

export function DestructiveConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  targetIdentifier,
  confirmButtonText = 'CONFIRM DESTRUCTION',
  isLoading = false
}: DestructiveConfirmDialogProps) {
  const [typedInput, setTypedInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypedInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isMatched = !targetIdentifier || typedInput.trim() === targetIdentifier.trim();

  const handleConfirm = async () => {
    if (!isMatched || isLoading) return;
    try {
      await onConfirm();
    } catch {
      // Parent manages error state — swallow to avoid unhandled rejection
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isMatched && !isLoading) {
      e.preventDefault();
      void handleConfirm();
    }
  };

  return (
    <TerminalModal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      title="DESTRUCTIVE ACTION WARNING"
      icon={AlertOctagon}
      variant="negative"
      maxWidth="md"
    >
      <div className="p-5 space-y-4 font-mono" onKeyDown={handleKeyDown}>
        <div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        </div>

        {targetIdentifier && (
          <div className="border border-border bg-black p-3 space-y-2">
            <div className="text-[11px] text-muted-foreground">
              To confirm deletion, please re-type target identifier below:
            </div>
            <div className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 select-all border border-accent/30">
              {targetIdentifier}
            </div>
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={`Type "${targetIdentifier}"`}
              autoFocus
              disabled={isLoading}
              className="w-full bg-surface border border-border px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-negative transition-colors"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border bg-black hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isMatched || isLoading}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-negative text-white hover:bg-negative/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="h-2 w-2 bg-white rounded-full animate-ping"></span>
                EXECUTING...
              </>
            ) : (
              confirmButtonText
            )}
          </button>
        </div>
      </div>
    </TerminalModal>
  );
}
