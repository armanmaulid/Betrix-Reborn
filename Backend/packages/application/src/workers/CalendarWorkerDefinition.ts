import { IWorkerDefinition } from './types.js';

export const CalendarWorkerDefinition: IWorkerDefinition = {
  id: 'fxmacrodata-calendar-sync',
  name: 'FXMacroData Economic Calendar Sync',
  category: 'calendar',
  description:
    'Maintains a real-time SSE connection to FXMacroData for economic calendar releases (Before/Forecast/Actual), with a daily broker-rollover cron job as a safety net if the stream drops unnoticed.',
  interval: 'Real-time (SSE) + Daily (broker rollover)',
  defaultStatus: 'running',
  initialProcessedCount: 0,
  nextRunOffsetMs: null
};
