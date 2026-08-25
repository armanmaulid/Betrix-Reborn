import { IWorkerDefinition } from './types.js';

export const CalendarWorkerDefinition: IWorkerDefinition = {
  id: 'fxmacrodata-calendar-sync',
  name: 'FXMacroData Economic Calendar Sync',
  category: 'calendar',
  description:
    'Maintains economic calendar releases (Before/Forecast/Actual) from FXMacroData: real-time SSE when a subscriber API key is set, a daily broker-rollover pass that inserts missing months, and a periodic value-refresh cron that backfills Actuals after release and refreshes Forecasts ahead of it — all guarded by a daily call budget so the free REST tier stays safe.',
  interval: 'Real-time (SSE*) + Daily insert + Refresh every 30 min',
  defaultStatus: 'running',
  initialProcessedCount: 0,
  nextRunOffsetMs: null
};
