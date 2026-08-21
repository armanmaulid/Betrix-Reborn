'use client';

import React, { useState, useEffect } from 'react';
import { AlertOctagon, X } from 'lucide-react';

export interface DestructiveConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  targetIdentifier?: string; // If provided, user must type this exact string to unlock confirm
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
    await onConfirm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && isMatched && !isLoading) {
      handleConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md border-2 border-negative bg-surface shadow-2xl relative">
        {/* Header Bar */}
        <div className="bg-negative/20 border-b border-negative/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-negative">
            <AlertOctagon className="w-4 h-4 animate-pulse" />
            <span className="font-mono text-xs font-bold tracking-widest uppercase">
              DESTRUCTIVE ACTION WARNING
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-mono text-sm font-bold text-foreground uppercase tracking-wide">
              {title}
            </h3>
            <p className="font-mono text-xs text-muted-foreground mt-1 leading-relaxed">
              {description}
            </p>
          </div>

          {targetIdentifier && (
            <div className="border border-border bg-black p-3 space-y-2">
              <div className="text-[11px] font-mono text-muted-foreground">
                To confirm deletion, please re-type target identifier below:
              </div>
              <div className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-1 select-all border border-accent/30">
                {targetIdentifier}
              </div>
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={`Type "${targetIdentifier}"`}
                autoFocus
                disabled={isLoading}
                className="w-full bg-surface border border-border px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-negative transition-colors"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border bg-black hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isMatched || isLoading}
              className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider bg-negative text-white hover:bg-negative/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
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
      </div>
    </div>
  );
}
