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
  // No fabricated pool limit — missing metrics must surface as zero/unknown
  // ("0 / 0"), never as a plausible-looking idle pool like "0 / 20".
  const total = safeActive + safeIdle;
  const usagePct = total > 0 ? Math.round((safeActive / total) * 100) : 0;
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
  // No fabricated default count — an empty/failed fetch means unknown (0).
  const total = workers.length;
  const wsWorker = workers.find((w) => w.id === 'finnhub-realtime-ws' || w.category === 'market');
  const isWsLive = wsWorker?.status === 'running';
  return { running, total, wsWorker, isWsLive };
}
