import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { BackgroundWorker } from '@operations/domain/entities/BackgroundWorker';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export * from './formatters';
export * from './constants';
export * from './routes';
export * from './chart-colors';

export interface DbPoolStats {
  active: number;
  idle: number;
  total: number;
  usagePct: number;
}

export function getDbPoolStats(active?: number, idle?: number): DbPoolStats {
  const safeActive = active ?? 0;
  const safeIdle = idle ?? 0;
  const total = safeActive + safeIdle || 20;
  const usagePct = Math.round((safeActive / (total || 1)) * 100);
  return { active: safeActive, idle: safeIdle, total, usagePct };
}

export interface WorkerStats {
  running: number;
  total: number;
  wsWorker?: BackgroundWorker | any;
  isWsLive: boolean;
}

export function getWorkerStats(workers: (BackgroundWorker | any)[] = []): WorkerStats {
  const running = workers.filter((w) => w.status === 'running').length;
  const total = workers.length || 4;
  const wsWorker = workers.find((w) => w.id === 'finnhub-realtime-ws' || w.category === 'market');
  const isWsLive = wsWorker?.status === 'running';
  return { running, total, wsWorker, isWsLive };
}
