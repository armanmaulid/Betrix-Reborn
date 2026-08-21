import { IWorkerDefinition } from './types.js';

export const CleanupWorkerDefinition: IWorkerDefinition = {
  id: 'maintenance-cleanup-worker',
  name: 'Maintenance & System Cleanup Worker',
  category: 'maintenance',
  description: 'Executes hourly system purge for expired tokens, expired sessions, and old login attempts to keep database lean and performant.',
  interval: 'Hourly (0 * * * *)',
  defaultStatus: 'running',
  initialProcessedCount: 18,
  nextRunOffsetMs: 3600000
};
