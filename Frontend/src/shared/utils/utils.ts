import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

/**
 * Minimal structural view of a worker record — keeps the shared layer free of
 * imports from feature modules while still matching `BackgroundWorker`.
 */
export interface WorkerLike {
  id?: string;
  name?: string;
  status?: string;
  category?: string;
  interval?: string | number;
}

export interface WorkerStats {
  running: number;
  total: number;
  wsWorker?: WorkerLike;
  isWsLive: boolean;
}

export function getWorkerStats(workers: WorkerLike[] = []): WorkerStats {
  const running = workers.filter((w) => w.status === 'running').length;
  // No fabricated default count — an empty/failed fetch means unknown (0).
  const total = workers.length;
  const wsWorker = workers.find((w) => w.id === 'finnhub-realtime-ws' || w.category === 'market');
  const isWsLive = wsWorker?.status === 'running';
  return { running, total, wsWorker, isWsLive };
}
