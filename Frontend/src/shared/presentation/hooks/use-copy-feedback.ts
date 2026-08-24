import { useState, useCallback, useRef, useEffect } from 'react';
import { useOptionalToast } from '@/shared/presentation/ui/terminal-toast';

export function useCopyFeedback(timeoutMs: number = 2000) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useOptionalToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (
      text: string,
      keyOrTitle: string = 'default',
      options?: { toastTitle?: string; toastMessage?: string; showToast?: boolean }
    ): Promise<boolean> => {
      const showToast = options?.showToast ?? Boolean(options?.toastTitle || options?.toastMessage);

      const legacyCopy = (): boolean => {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.setAttribute('readonly', '');
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(textarea);
          return ok;
        } catch {
          return false;
        }
      };

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else if (!legacyCopy()) {
          throw new Error('Clipboard unavailable');
        }
        setCopiedKey(keyOrTitle);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setCopiedKey(null);
        }, timeoutMs);

        if (showToast && toast) {
          toast.success(
            options?.toastTitle || 'COPIED',
            options?.toastMessage || 'Copied to clipboard.'
          );
        }
        return true;
      } catch {
        if (showToast && toast) {
          toast.error('COPY FAILED', 'Unable to copy text to clipboard.');
        }
        return false;
      }
    },
    [timeoutMs, toast]
  );

  const isCopied = useCallback(
    (key: string = 'default') => copiedKey === key,
    [copiedKey]
  );

  return {
    copiedKey,
    isCopied,
    copy
  };
}
