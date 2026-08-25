'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  timestamp: string;
}

interface ToastContextType {
  toast: (options: { type?: ToastType; title: string; description?: string }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Clear pending auto-dismiss timers when the provider unmounts.
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      type = 'info',
      title,
      description
    }: {
      type?: ToastType;
      title: string;
      description?: string;
    }) => {
      const id = 'toast-' + Math.random().toString(36).substring(2, 9);
      const timestamp = new Date().toISOString().substring(11, 19);
      const newToast: ToastMessage = { id, type, title, description, timestamp };

      setToasts((prev) => [...prev.slice(-4), newToast]);

      const timeoutId = setTimeout(() => {
        timeoutsRef.current.delete(timeoutId);
        dismiss(id);
      }, 5000);
      timeoutsRef.current.add(timeoutId);
    },
    [dismiss]
  );

  const success = useCallback(
    (title: string, description?: string) => toast({ type: 'success', title, description }),
    [toast]
  );
  const error = useCallback(
    (title: string, description?: string) => toast({ type: 'error', title, description }),
    [toast]
  );
  const info = useCallback(
    (title: string, description?: string) => toast({ type: 'info', title, description }),
    [toast]
  );
  const warning = useCallback(
    (title: string, description?: string) => toast({ type: 'warning', title, description }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning, dismiss }}>
      {children}
      {/* Toast HUD Viewport */}
      <aside
        aria-label="Terminal notifications"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((item) => {
          const borderColor =
            item.type === 'success'
              ? 'border-positive'
              : item.type === 'error'
                ? 'border-negative'
                : item.type === 'warning'
                  ? 'border-accent'
                  : 'border-info';

          const textColor =
            item.type === 'success'
              ? 'text-positive'
              : item.type === 'error'
                ? 'text-negative'
                : item.type === 'warning'
                  ? 'text-accent'
                  : 'text-info';

          return (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto border-l-4 ${borderColor} bg-surface border-y border-r border-border p-3 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {item.type === 'success' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-positive shrink-0" />
                  )}
                  {item.type === 'error' && (
                    <XCircle className="w-3.5 h-3.5 text-negative shrink-0" />
                  )}
                  {item.type === 'warning' && (
                    <AlertTriangle className="w-3.5 h-3.5 text-accent shrink-0" />
                  )}
                  {item.type === 'info' && <Info className="w-3.5 h-3.5 text-info shrink-0" />}
                  <span
                    className={`font-mono text-xs font-bold uppercase tracking-wider ${textColor}`}
                  >
                    {item.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                    {item.timestamp}
                  </span>
                  <button
                    onClick={() => dismiss(item.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-pointer"
                    aria-label="Dismiss notification"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {item.description && (
                <p className="mt-1 font-mono text-xs text-foreground/80 leading-relaxed pl-5.5">
                  {item.description}
                </p>
              )}
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function useOptionalToast() {
  return useContext(ToastContext);
}
