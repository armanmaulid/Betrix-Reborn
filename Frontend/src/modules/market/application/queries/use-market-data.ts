'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { marketRepository } from '@market/infrastructure/repositories/HttpMarketRepository';
import { marketKeys } from '@market/application/market.keys';
import { MarketMapper } from '@market/infrastructure/mappers/MarketMapper';
import type { MarketInstrument, StreamSymbolEntity } from '@market/domain/entities/MarketInstrument';
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (symbolData: Partial<MarketInstrument> & { symbol: string }) =>
      marketRepository.saveSymbol(symbolData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketKeys.all });
    }
  });
}

export function useDeleteSymbolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (symbol: string) => marketRepository.deleteSymbol(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketKeys.all });
    }
  });
}

export function useStreamSymbolsQuery(activeOnly: boolean = false) {
  return useQuery<StreamSymbolEntity[]>({
    queryKey: marketKeys.streamSymbols(activeOnly),
    queryFn: () => marketRepository.getStreamSymbols(activeOnly),
    staleTime: 30 * 1000
  });
}

export function useSaveStreamSymbolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (streamData: Partial<StreamSymbolEntity> & { symbol: string; finnhubSymbol: string }) =>
      marketRepository.saveStreamSymbol(streamData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketKeys.all });
    }
  });
}

export function useDeleteStreamSymbolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (symbol: string) => marketRepository.deleteStreamSymbol(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketKeys.all });
    }
  });
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
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (initialPrices && initialPrices.length > 0) {
      setLivePrices((prev) => {
        const next = new Map(prev);
        for (const p of initialPrices) {
          next.set(p.symbol.toUpperCase(), p);
        }
        return next;
      });
      setIsConnected(true);
    }
  }, [initialPrices]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isCancelled = false;

    const connectStream = async () => {
      try {
        const ticketJson = await apiFetch<any>('/api/auth/stream-ticket', { method: 'POST' });
        if (isCancelled) return;
        const ticket = ticketJson.data?.ticket;
        if (!ticket || isCancelled) return;

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
