'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import type { MarketPrice, MarketSymbol, StreamSymbol } from '@/lib/types';

// ==========================================
// 1. MASTER INSTRUMENTS CATALOG (symbols table)
// ==========================================
export function useMarketSymbolsQuery(activeOnly: boolean = false) {
  return useQuery<MarketSymbol[]>({
    queryKey: ['market', 'symbols', { activeOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/market/symbols?activeOnly=${activeOnly}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch symbols: ${res.statusText}`);
      }
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 60 * 1000
  });
}

export function useSaveSymbolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (symbolData: Partial<MarketSymbol> & { symbol: string }) => {
      const res = await fetch('/api/admin/symbols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(symbolData)
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to save symbol.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', 'symbols'] });
    }
  });
}

export function useDeleteSymbolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (symbol: string) => {
      const res = await fetch(`/api/admin/symbols/${encodeURIComponent(symbol.toUpperCase())}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete symbol.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', 'symbols'] });
    }
  });
}

// ==========================================
// 2. FINNHUB STREAM SYMBOLS (stream_symbols table)
// ==========================================
export function useStreamSymbolsQuery(activeOnly: boolean = false) {
  return useQuery<StreamSymbol[]>({
    queryKey: ['market', 'stream-symbols', { activeOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/market/stream-symbols?activeOnly=${activeOnly}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch stream symbols: ${res.statusText}`);
      }
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 30 * 1000
  });
}

export function useSaveStreamSymbolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (streamData: Partial<StreamSymbol> & { symbol: string; finnhubSymbol: string }) => {
      const res = await fetch('/api/admin/stream-symbols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(streamData)
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to save stream symbol.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', 'stream-symbols'] });
    }
  });
}

export function useDeleteStreamSymbolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (symbol: string) => {
      const res = await fetch(`/api/admin/stream-symbols/${encodeURIComponent(symbol.toUpperCase())}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete stream symbol.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', 'stream-symbols'] });
      queryClient.invalidateQueries({ queryKey: ['market', 'prices'] });
    }
  });
}

// ==========================================
// 3. REAL-TIME STREAMING & PRICES SNAPSHOT
// ==========================================
export function useMarketPricesSnapshot() {
  return useQuery<MarketPrice[]>({
    queryKey: ['market', 'prices', 'snapshot'],
    queryFn: async () => {
      const res = await fetch('/api/market/prices');
      if (!res.ok) {
        throw new Error(`Failed to fetch initial price snapshot: ${res.statusText}`);
      }
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 1000,
    refetchInterval: 1500, // 1.5s active telemetry sync
    refetchOnWindowFocus: true
  });
}

export function useRealtimeMarketStream() {
  const { data: initialPrices = [], isLoading: isSnapshotLoading } = useMarketPricesSnapshot();
  const [livePrices, setLivePrices] = useState<Map<string, MarketPrice>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  // Sync initial and polled prices snapshot
  useEffect(() => {
    if (initialPrices && initialPrices.length > 0) {
      setLivePrices((prev) => {
        const next = new Map(prev);
        for (const p of initialPrices) {
          const existing = next.get(p.symbol.toUpperCase());
          next.set(p.symbol.toUpperCase(), {
            ...existing,
            ...p,
            symbol: p.symbol.toUpperCase()
          });
        }
        return next;
      });
      setIsConnected(true);
    }
  }, [initialPrices]);

  // Connect to SSE stream via acquired stream ticket
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isCancelled = false;

    const connectStream = async () => {
      try {
        // 1. Acquire one-time stream ticket (ADR-18)
        const ticketRes = await fetch('/api/auth/stream-ticket', { method: 'POST' });
        if (!ticketRes.ok || isCancelled) return;
        const ticketJson = await ticketRes.json();
        const ticket = ticketJson.data?.ticket;
        if (!ticket || isCancelled) return;

        // 2. Connect to SSE stream
        eventSource = new EventSource(`/api/stream/market?ticket=${encodeURIComponent(ticket)}`);

        eventSource.onopen = () => {
          if (!isCancelled) setIsConnected(true);
        };

        const handleTickMessage = (event: MessageEvent) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload && (payload.symbol || payload.s)) {
              const sym = (payload.symbol || payload.s).toUpperCase();
              setLivePrices((prev) => {
                const next = new Map(prev);
                const existing = next.get(sym);
                next.set(sym, {
                  ...existing,
                  ...payload,
                  symbol: sym,
                  bid: payload.bid ?? payload.p ?? existing?.bid ?? 0,
                  ask: payload.ask ?? payload.p ?? existing?.ask ?? 0,
                  spread: payload.spread ?? existing?.spread ?? 0,
                  change24hPercent: payload.change24hPercent ?? existing?.change24hPercent ?? 0
                });
                return next;
              });
            }
          } catch {}
        };

        eventSource.onmessage = handleTickMessage;
        eventSource.addEventListener('tick', handleTickMessage as EventListener);
        eventSource.addEventListener('price:tick', handleTickMessage as EventListener);

        eventSource.onerror = () => {
          if (!isCancelled) setIsConnected(false);
        };
      } catch {
        if (!isCancelled) setIsConnected(false);
      }
    };

    connectStream();

    return () => {
      isCancelled = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const priceMap = livePrices;
  const pricesList = Array.from(livePrices.values());

  return {
    priceMap,
    pricesList,
    isConnected,
    isLoading: isSnapshotLoading && livePrices.size === 0
  };
}
