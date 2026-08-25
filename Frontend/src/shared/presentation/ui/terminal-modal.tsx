'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X, type LucideIcon } from 'lucide-react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  icon?: LucideIcon | React.ElementType;
  variant?: 'accent' | 'negative' | 'positive' | 'info' | 'default';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

export function TerminalModal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  variant = 'accent',
  maxWidth = 'md',
  children,
  footer,
  className = '',
  closeOnEscape = true,
  closeOnBackdrop = false
}: TerminalModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();

  // Focus management + background scroll lock for the lifetime of the dialog.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable ?? panel).focus();
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl'
  }[maxWidth];

  const variantStyles = {
    accent: {
      border: 'border-accent',
      headerBg: 'bg-accent/10 border-accent/30 text-accent',
      iconColor: 'text-accent'
    },
    negative: {
      border: 'border-negative',
      headerBg: 'bg-negative/20 border-negative/40 text-negative',
      iconColor: 'text-negative'
    },
    positive: {
      border: 'border-positive',
      headerBg: 'bg-positive/10 border-positive/30 text-positive',
      iconColor: 'text-positive'
    },
    info: {
      border: 'border-info',
      headerBg: 'bg-info/10 border-info/30 text-info',
      iconColor: 'text-info'
    },
    default: {
      border: 'border-border',
      headerBg: 'bg-surface border-border text-foreground',
      iconColor: 'text-muted-foreground'
    }
  }[variant];

  // Keep Tab cycling inside the dialog while it is open.
  const handleTrapKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in select-none"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleTrapKeyDown}
        className={`w-full ${maxWidthStyles} border-2 ${variantStyles.border} bg-surface shadow-2xl font-mono flex flex-col max-h-[90vh] overflow-hidden outline-none ${className}`}
      >
        {/* Header */}
        <div
          className={`border-b px-4 py-3 flex items-center justify-between shrink-0 ${variantStyles.headerBg}`}
        >
          <div className="flex items-center space-x-2">
            {Icon && <Icon className={`w-4 h-4 shrink-0 ${variantStyles.iconColor}`} />}
            <span id={titleId} className="text-xs font-bold tracking-widest uppercase truncate">
              {title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body content */}
        <div className="overflow-y-auto flex-1">{children}</div>

        {/* Optional Footer */}
        {footer && (
          <div className="border-t border-border bg-surface px-4 py-2.5 flex items-center justify-between shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
