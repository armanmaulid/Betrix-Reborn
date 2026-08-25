import { IWorkerDefinition } from './types.js';
import { FinnhubWsWorkerDefinition } from './FinnhubWsWorkerDefinition.js';
import { NewsWorkerDefinition } from './NewsWorkerDefinition.js';
import { SyncWorkerDefinition } from './SyncWorkerDefinition.js';
import { CleanupWorkerDefinition } from './CleanupWorkerDefinition.js';
import { ExampleTemplateWorkerDefinition } from './ExampleTemplateWorkerDefinition.js';
import { CalendarWorkerDefinition } from './CalendarWorkerDefinition.js';
import { CalendarSeederWorkerDefinition } from './CalendarSeederWorkerDefinition.js';

export * from './types.js';
export * from './FinnhubWsWorkerDefinition.js';
export * from './NewsWorkerDefinition.js';
export * from './SyncWorkerDefinition.js';
export * from './CleanupWorkerDefinition.js';
export * from './ExampleTemplateWorkerDefinition.js';
export * from './CalendarWorkerDefinition.js';
export * from './CalendarSeederWorkerDefinition.js';

/**
 * Built-in registry of all background worker definitions.
 * To register a new worker, simply add its definition file in this directory
 * and export it in this list — WorkerManagerService will auto-discover and register it!
 */
export const BUILTIN_WORKERS: IWorkerDefinition[] = [
  NewsWorkerDefinition,
  FinnhubWsWorkerDefinition,
  SyncWorkerDefinition,
  CleanupWorkerDefinition,
  ExampleTemplateWorkerDefinition,
  CalendarWorkerDefinition,
  CalendarSeederWorkerDefinition
];
