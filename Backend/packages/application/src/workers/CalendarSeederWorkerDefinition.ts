import { IWorkerDefinition } from './types.js';

export const CalendarSeederWorkerDefinition: IWorkerDefinition = {
  id: 'calendar-scheduler-seed',
  name: 'FXMacroData Calendar Seeder',
  category: 'calendar',
  description:
    'Guarantees calendar SCHEDULE coverage (event names/times, values left to the refresh pass): on worker start it seeds last year, this year and next year — skipping any UTC day that already has rows — and a daily broker-rollover cron re-checks that the current month is present, seeding it if not. Schedule-only by design: one /v1/calendar call per run keeps the FXMacroData free tier safe. Enrichment of Before/Forecast/Actual stays with the Calendar Sync worker.',
  interval: 'On start + Daily (broker rollover)',
  defaultStatus: 'running',
  initialProcessedCount: 0,
  nextRunOffsetMs: null
};
