import {
  BackgroundWorker,
  BackgroundWorkerInfo,
  WorkerAction,
  IWorkerStateRepository
} from '@betrix/domain';
import { BUILTIN_WORKERS, IWorkerDefinition } from '../workers/index.js';

interface RegisteredWorker {
  definition: IWorkerDefinition;
  entity: BackgroundWorker;
}

/**
 * Command publisher abstraction so this service does not depend on
 * `@betrix/infra` directly (kept in `application` per the layering rules —
 * the concrete `RedisWorkerCommandBus` is injected from `apps/api`'s
 * composition root).
 */
export interface IWorkerCommandPublisher {
  publishCommand(workerId: string, action: WorkerAction, adminId: string | null): Promise<void>;
}

/**
 * Scalable Background Worker Manager Domain Service (DDD Admin Bounded Context).
 *
 * SSOT note: `getAllWorkers`/`getWorkerById` merge two sources — the static
 * `IWorkerDefinition` metadata (name, category, description, interval; these
 * never change at runtime) with the live `WorkerStateRecord` persisted in
 * Postgres via `IWorkerStateRepository` (status, processedCount, errorCount,
 * lastError — these are what the actual `apps/worker` process reported).
 * The in-memory `BackgroundWorker` entity map is retained only as the
 * fallback/default before a worker has ever reported in, and to keep
 * `BackgroundWorker`'s domain invariants centralized — it is NOT the source
 * of truth for control decisions once `workerStateRepo` is provided.
 *
 * `controlWorker` writes the command to Postgres first (so it survives even
 * if the target `apps/worker` process is currently down — see
 * `wasDeliberatelyHalted()` in ManagedWorkerBase, which reconciles against
 * this same table on worker boot), then publishes it over Redis pub/sub for
 * low-latency delivery to a live worker process, then returns immediately
 * (optimistic) rather than waiting for the worker to acknowledge.
 */
export class WorkerManagerService {
  private workers: Map<string, RegisteredWorker> = new Map();

  constructor(
    initialDefinitions: IWorkerDefinition[] = BUILTIN_WORKERS,
    private readonly workerStateRepo?: IWorkerStateRepository,
    private readonly commandPublisher?: IWorkerCommandPublisher
  ) {
    this.registerDefinitions(initialDefinitions);
  }

  /**
   * Bulk registers worker definitions.
   */
  public registerDefinitions(definitions: IWorkerDefinition[]): void {
    for (const def of definitions) {
      this.registerWorker(def);
    }
  }

  /**
   * Dynamically registers a single worker definition as a BackgroundWorker domain entity.
   */
  public registerWorker(def: IWorkerDefinition): void {
    const nextRunAt = def.nextRunOffsetMs
      ? new Date(Date.now() + def.nextRunOffsetMs).toISOString()
      : null;

    const entity = new BackgroundWorker({
      id: def.id,
      name: def.name,
      category: def.category,
      description: def.description,
      status: def.defaultStatus ?? 'running',
      interval: def.interval,
      processedCount: def.initialProcessedCount ?? 0,
      errorCount: def.initialErrorCount ?? 0,
      nextRunAt
    });

    this.workers.set(def.id, {
      definition: def,
      entity
    });
  }

  /** Merges the in-memory entity's static fields with the SSOT record's live status, if available. */
  private async toInfo(w: RegisteredWorker): Promise<BackgroundWorkerInfo> {
    const base = w.entity.toJSON();
    if (!this.workerStateRepo) return base;

    const record = await this.workerStateRepo.findByWorkerId(w.definition.id);
    if (!record) return base;

    return {
      ...base,
      status: record.status,
      processedCount: record.processedCount,
      errorCount: record.errorCount,
      lastError: record.lastError
    };
  }

  /**
   * Returns live status snapshot of all registered background workers,
   * merged against `worker_states` (SSOT) when a repository is configured.
   */
  public async getAllWorkers(): Promise<BackgroundWorkerInfo[]> {
    return Promise.all(Array.from(this.workers.values()).map((w) => this.toInfo(w)));
  }

  /**
   * Finds a specific worker by unique ID.
   */
  public async getWorkerById(id: string): Promise<BackgroundWorkerInfo | null> {
    const w = this.workers.get(id);
    if (!w) return null;
    return this.toInfo(w);
  }

  /**
   * Controls worker lifecycle state (start, pause, stop, restart).
   *
   * When `workerStateRepo`/`commandPublisher` are configured, this is the
   * real control path: the command is persisted to Postgres (SSOT) and
   * published to the worker process over Redis. The in-memory
   * `BackgroundWorker` entity and any `onStart`/`onPause`/`onStop`/
   * `onRestart` hooks on the definition are still invoked for backward
   * compatibility with definitions that rely on them, but they are no
   * longer what makes the command take effect on the actual worker process.
   */
  public async controlWorker(
    id: string,
    action: WorkerAction,
    adminId: string | null = null
  ): Promise<BackgroundWorkerInfo> {
    const w = this.workers.get(id);
    if (!w) {
      throw new Error(`Background worker with ID "${id}" not found.`);
    }

    // A5 — exhaustive lookup tables keyed by WorkerAction. Adding a new
    // action without a corresponding entry will fail the build (the Record
    // type enforces coverage), which is the whole point of replacing the
    // earlier `switch` statement.
    const entityAction: Record<WorkerAction, () => void> = {
      start: () => w.entity.start(),
      pause: () => w.entity.pause(),
      stop: () => w.entity.stop(),
      restart: () => w.entity.restart()
    };
    const hookFor: Record<WorkerAction, (() => Promise<void> | void) | undefined> = {
      start: w.definition.onStart,
      pause: w.definition.onPause,
      stop: w.definition.onStop,
      restart: w.definition.onRestart
    };
    entityAction[action]();
    if (hookFor[action]) await hookFor[action]!();

    if (this.workerStateRepo) {
      const nextStatus = w.entity.toJSON().status;
      await this.workerStateRepo.recordCommand(id, nextStatus, action, adminId);
    }
    if (this.commandPublisher) {
      await this.commandPublisher.publishCommand(id, action, adminId);
    }

    return this.toInfo(w);
  }

  /**
   * Records worker telemetry execution delta and error logging on the
   * in-memory entity. When a worker process reports via Redis pub/sub, the
   * report is written directly to `worker_states` by the worker process
   * itself (see ManagedWorkerBase.reportHealth) — this method remains for
   * definitions that still rely on the older in-process callback pattern.
   */
  public recordExecution(id: string, processedDelta: number = 1, error?: string): void {
    const w = this.workers.get(id);
    if (!w) return;

    if (error) {
      w.entity.recordError(error);
    } else {
      w.entity.recordExecution(processedDelta);
    }
  }
}
