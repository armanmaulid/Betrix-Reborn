'use client';

import React, { useEffect, useRef } from 'react';
import { X, type LucideIcon } from 'lucide-react';

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
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

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
        ref={modalRef}
        className={`w-full ${maxWidthStyles} border-2 ${variantStyles.border} bg-surface shadow-2xl font-mono flex flex-col max-h-[90vh] overflow-hidden ${className}`}
      >
        {/* Header */}
        <div
          className={`border-b px-4 py-3 flex items-center justify-between shrink-0 ${variantStyles.headerBg}`}
        >
          <div className="flex items-center space-x-2">
            {Icon && <Icon className={`w-4 h-4 shrink-0 ${variantStyles.iconColor}`} />}
            <span className="text-xs font-bold tracking-widest uppercase truncate">
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
        <div className="overflow-y-auto flex-1">
          {children}
        </div>

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
