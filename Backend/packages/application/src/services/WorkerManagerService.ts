import { BackgroundWorker, BackgroundWorkerInfo, WorkerAction } from '@betrix/domain';
import { BUILTIN_WORKERS, IWorkerDefinition } from '../workers/index.js';

interface RegisteredWorker {
  definition: IWorkerDefinition;
  entity: BackgroundWorker;
}

/**
 * Scalable Background Worker Manager Domain Service (DDD Admin Bounded Context).
 *
 * Implements a pure DDD Application Service + Registry pattern.
 * Worker definitions are decoupled into individual files in `workers/`.
 * State transitions and business invariants are encapsulated within `BackgroundWorker` domain entity.
 */
export class WorkerManagerService {
  private workers: Map<string, RegisteredWorker> = new Map();

  constructor(initialDefinitions: IWorkerDefinition[] = BUILTIN_WORKERS) {
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

  /**
   * Returns live status snapshot of all registered background workers.
   */
  public getAllWorkers(): BackgroundWorkerInfo[] {
    return Array.from(this.workers.values()).map((w) => w.entity.toJSON());
  }

  /**
   * Finds a specific worker by unique ID.
   */
  public getWorkerById(id: string): BackgroundWorkerInfo | null {
    const w = this.workers.get(id);
    if (!w) return null;
    return w.entity.toJSON();
  }

  /**
   * Controls worker lifecycle state (start, pause, stop, restart) enforcing domain invariants and hooks.
   */
  public async controlWorker(id: string, action: WorkerAction): Promise<BackgroundWorkerInfo> {
    const w = this.workers.get(id);
    if (!w) {
      throw new Error(`Background worker with ID "${id}" not found.`);
    }

    switch (action) {
      case 'start':
        w.entity.start();
        if (w.definition.onStart) await w.definition.onStart();
        break;

      case 'pause':
        w.entity.pause();
        if (w.definition.onPause) await w.definition.onPause();
        break;

      case 'stop':
        w.entity.stop();
        if (w.definition.onStop) await w.definition.onStop();
        break;

      case 'restart':
        w.entity.restart();
        if (w.definition.onRestart) await w.definition.onRestart();
        break;
    }

    return w.entity.toJSON();
  }

  /**
   * Records worker telemetry execution delta and error logging.
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
