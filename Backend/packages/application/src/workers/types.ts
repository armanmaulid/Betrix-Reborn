import { WorkerStatus, WorkerAction, WorkerCategory } from '@betrix/domain';

export interface IWorkerDefinition {
  /** Unique immutable worker identifier (e.g. 'finnhub-news-poller') */
  readonly id: string;
  /** Human-readable display name */
  readonly name: string;
  /** Domain subsystem category */
  readonly category: WorkerCategory;
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

/**
 * Live telemetry a running worker reports about itself. Returned by
 * `IManagedWorker.getHealth()` and forwarded to `IWorkerStateRepository.recordReport`
 * so the SSOT row in Postgres reflects what the worker process actually observed —
 * never a value the API process guesses on the worker's behalf.
 */
export interface WorkerHealthSnapshot {
  status: WorkerStatus;
  processedCount: number;
  errorCount: number;
  lastError: string | null;
}

/**
 * Lifecycle contract every worker CLASS running inside `apps/worker` must implement
 * so that admin commands issued from `apps/api` (via Redis pub/sub) have a real,
 * uniform effect on the process — not just a status-board update.
 *
 * `pause()` MUST keep any persistent connection (WebSocket, SSE) open and merely stop
 * processing/persisting incoming data, so it can resume without paying reconnect cost.
 * `stop()` MUST release the connection/cron entirely. Do not conflate the two.
 */
export interface IManagedWorker {
  readonly workerId: string;
  start(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  getHealth(): WorkerHealthSnapshot;
}
