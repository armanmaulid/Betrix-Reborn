import { IWorkerDefinition } from './types.js';

export const SyncWorkerDefinition: IWorkerDefinition = {
  id: 'symbol-d1-sync-worker',
  name: 'Symbol & D1 Baseline Sync Worker',
  category: 'market',
  description: 'Audits and synchronizes Broker Symbol Catalog with database, synchronizes D1 open baselines across active symbols with dynamic Redis TTL.',
  interval: 'Daily Rollover (21:00 UTC)',
  defaultStatus: 'running',
  initialProcessedCount: 1499,
  nextRunOffsetMs: null
};
