'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { marketRepository } from '@market/infrastructure/repositories/HttpMarketRepository';
import { marketKeys } from '@market/application/market.keys';
import { MarketMapper } from '@market/infrastructure/mappers/MarketMapper';
import { useAdminMutation } from '@shared/application/useAdminMutation';
import type { MarketInstrument, StreamSymbolEntity, OhlcSymbolEntity } from '@market/domain/entities/MarketInstrument';
import type { PriceTick } from '@market/domain/value-objects/PriceTick';
import { apiFetch } from '@shared/infrastructure/http/api-client';

export function useMarketSymbolsQuery(activeOnly: boolean = false) {
  return useQuery<MarketInstrument[]>({
    queryKey: marketKeys.symbols(activeOnly),
    queryFn: () => marketRepository.getSymbols(activeOnly),
    staleTime: 60 * 1000
  });
}

export function useSaveSymbolMutation() {
  return useAdminMutation(
    (symbolData: Partial<MarketInstrument> & { symbol: string }) =>
      marketRepository.saveSymbol(symbolData),
    [marketKeys.all]
  );
}

export function useDeleteSymbolMutation() {
  return useAdminMutation(
    (symbol: string) => marketRepository.deleteSymbol(symbol),
    [marketKeys.all]
  );
}

export function useStreamSymbolsQuery(activeOnly: boolean = false) {
  return useQuery<StreamSymbolEntity[]>({
    queryKey: marketKeys.streamSymbols(activeOnly),
    queryFn: () => marketRepository.getStreamSymbols(activeOnly),
    staleTime: 30 * 1000
  });
}

export function useSaveStreamSymbolMutation() {
  return useAdminMutation(
    (streamData: Partial<StreamSymbolEntity> & { symbol: string; finnhubSymbol: string }) =>
      marketRepository.saveStreamSymbol(streamData),
    [marketKeys.all]
  );
}

export function useDeleteStreamSymbolMutation() {
  return useAdminMutation(
    (symbol: string) => marketRepository.deleteStreamSymbol(symbol),
    [marketKeys.all]
  );
}

export function useOhlcSymbolsQuery() {
  return useQuery<OhlcSymbolEntity[]>({
    queryKey: marketKeys.ohlcSymbols(),
    queryFn: () => marketRepository.getOhlcSymbols(),
    staleTime: 60 * 1000
  });
}

export function useSaveOhlcSymbolMutation() {
  return useAdminMutation(
    (data: { symbol: string; dukascopySymbol: string; description?: string; isActive?: boolean }) =>
      marketRepository.saveOhlcSymbol(data),
    [marketKeys.all]
  );
}

export function useDeleteOhlcSymbolMutation() {
  return useAdminMutation(
    (symbol: string) => marketRepository.deleteOhlcSymbol(symbol),
    [marketKeys.all]
  );
}

export function useMarketPricesSnapshot() {
  return useQuery<PriceTick[]>({
    queryKey: marketKeys.prices(),
    queryFn: () => marketRepository.getPricesSnapshot(),
    staleTime: 1000,
    refetchInterval: 1500,
    refetchOnWindowFocus: true
  });
}

export function useRealtimeMarketStream() {
  const { data: initialPrices = [], isLoading: isSnapshotLoading } = useMarketPricesSnapshot();
  const [livePrices, setLivePrices] = useState<Map<string, PriceTick>>(new Map());
  // Connectivity is owned exclusively by the SSE lifecycle — a REST snapshot
  // response says nothing about the stream and must not flip this flag.
  const [isConnected, setIsConnected] = useState(false);
  // Symbols that have received at least one live SSE tick. The REST snapshot
  // must never overwrite them (its data may be older than the last tick).
  const liveSymbolsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!initialPrices || initialPrices.length === 0) return;
    setLivePrices((prev) => {
      const next = new Map(prev);
      for (const p of initialPrices) {
        const sym = p.symbol.toUpperCase();
        if (liveSymbolsRef.current.has(sym)) continue;
        next.set(sym, p);
      }
      return next;
    });
  }, [initialPrices]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isCancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const MAX_RETRY_DELAY = 30000;

    const connectStream = async () => {
      try {
        const ticketJson = await apiFetch<any>('/api/auth/stream-ticket', { method: 'POST' });
        if (isCancelled) return;
        const ticket = ticketJson.data?.ticket;
        if (!ticket || isCancelled) return;

        eventSource = new EventSource(`/api/stream/market?ticket=${encodeURIComponent(ticket)}`);

        eventSource.onopen = () => {
          if (!isCancelled) {
            setIsConnected(true);
            retryCount = 0;
          }
        };

        const handleTickMessage = (event: MessageEvent) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload && (payload.symbol || payload.s)) {
              const sym = (payload.symbol || payload.s).toUpperCase();
              liveSymbolsRef.current.add(sym);
              setLivePrices((prev) => {
                const next = new Map(prev);
                const existing = next.get(sym);
                const updatedTick = MarketMapper.toPriceTick(payload, existing);
                next.set(sym, updatedTick);
                return next;
              });
            }
          } catch {}
        };

        eventSource.onmessage = handleTickMessage;
        eventSource.addEventListener('tick', handleTickMessage as EventListener);
        eventSource.addEventListener('price:tick', handleTickMessage as EventListener);

        eventSource.onerror = () => {
          if (isCancelled) return;
          setIsConnected(false);
          // Let the REST snapshot resume refreshing values until the stream returns.
          liveSymbolsRef.current.clear();
          eventSource?.close();
          const delay = Math.min(1000 * Math.pow(2, retryCount), MAX_RETRY_DELAY);
          retryCount++;
          retryTimeout = setTimeout(() => {
            if (!isCancelled) connectStream();
          }, delay);
        };
      } catch {
        if (isCancelled) return;
        setIsConnected(false);
        const delay = Math.min(1000 * Math.pow(2, retryCount), MAX_RETRY_DELAY);
        retryCount++;
        retryTimeout = setTimeout(() => {
          if (!isCancelled) connectStream();
        }, delay);
      }
    };

    connectStream();

    return () => {
      isCancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (eventSource) eventSource.close();
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
