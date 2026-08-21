import { WorkerStatus, WorkerAction } from '@betrix/domain';

export interface IWorkerDefinition {
  /** Unique immutable worker identifier (e.g. 'finnhub-news-poller') */
  readonly id: string;
  /** Human-readable display name */
  readonly name: string;
  /** Domain subsystem category */
  readonly category: 'market' | 'news' | 'maintenance' | 'intelligence';
  /** Detailed operational description for maintenance auditing */
  readonly description: string;
  /** Execution cadence or trigger interval (e.g. '10s', 'Hourly', 'Real-time (<50ms)') */
  readonly interval: string;
  /** Default startup status (defaults to 'running') */
  readonly defaultStatus?: WorkerStatus;
  /** Initial count baseline for observability */
  readonly initialProcessedCount?: number;
  /** Initial error count baseline */
  readonly initialErrorCount?: number;
  /** Milliseconds until next expected execution for scheduling displays */
  readonly nextRunOffsetMs?: number | null;
  /** Optional lifecycle callback when transitioned to running */
  onStart?(): Promise<void> | void;
  /** Optional lifecycle callback when paused */
  onPause?(): Promise<void> | void;
  /** Optional lifecycle callback when stopped */
  onStop?(): Promise<void> | void;
  /** Optional lifecycle callback when restarted */
  onRestart?(): Promise<void> | void;
}
