import type { Redis } from '@upstash/redis';
import type { WorkerAction, WorkerStatus } from '@betrix/domain';

/**
 * Command published by `apps/api` (WorkerManagerService) whenever an admin
 * issues start/pause/stop/restart from the panel.
 */
export interface WorkerCommandMessage {
  action: WorkerAction;
  adminId: string | null;
  timestamp: number;
}

/**
 * Health report published by `apps/worker` (the process actually running the
 * worker) after executing a command or on periodic heartbeat.
 */
export interface WorkerReportMessage {
  status: WorkerStatus;
  processedCount: number;
  errorCount: number;
  lastError: string | null;
  timestamp: number;
}

function commandChannel(workerId: string): string {
  return `worker:command:${workerId}`;
}

function reportChannel(workerId: string): string {
  return `worker:report:${workerId}`;
}

/**
 * Thin wrapper over the `@upstash/redis` REST client's pub/sub (HTTP-streaming
 * based — no persistent TCP connection needed, so it works from both the
 * `apps/api` and `apps/worker` processes as-is). This is a transport only:
 * messages are fire-and-forget, so `worker_states` in Postgres (see
 * IWorkerStateRepository) remains the SSOT for status — a command published
 * here while the target worker process is down is not lost because the
 * command is written to Postgres first, and `apps/worker/main.ts` reconciles
 * against Postgres on boot.
 */
export class RedisWorkerCommandBus {
  constructor(private readonly redis: Redis) {}

  /** Called from `apps/api` when an admin issues a lifecycle command. */
  public async publishCommand(workerId: string, message: WorkerCommandMessage): Promise<void> {
    await this.redis.publish(commandChannel(workerId), JSON.stringify(message));
  }

  /**
   * Called from `apps/worker`. Returns an unsubscribe function — callers MUST
   * invoke it on worker `stop()` to release the underlying subscription.
   */
  public subscribeCommands(
    workerId: string,
    onCommand: (message: WorkerCommandMessage) => void | Promise<void>
  ): () => void {
    const subscriber = this.redis.subscribe(commandChannel(workerId));
    subscriber.on('message', ({ message }) => {
      try {
        const parsed: WorkerCommandMessage =
          typeof message === 'string' ? JSON.parse(message) : message;
        void onCommand(parsed);
      } catch {
        // Malformed command payload — ignore rather than crash the worker process.
      }
    });
    return () => {
      void subscriber.unsubscribe();
    };
  }

  /** Called from `apps/worker` after executing a command or on periodic heartbeat. */
  public async publishReport(workerId: string, message: WorkerReportMessage): Promise<void> {
    await this.redis.publish(reportChannel(workerId), JSON.stringify(message));
  }

  /**
   * Called from `apps/api`, optional — lets the admin panel receive live
   * status pushes instead of relying solely on the 5s poll in `useWorkersQuery`.
   * Postgres (`worker_states`) remains what `GET /admin/workers` reads from;
   * this is purely a UX enhancement layered on top.
   */
  public subscribeReports(
    workerId: string,
    onReport: (message: WorkerReportMessage) => void | Promise<void>
  ): () => void {
    const subscriber = this.redis.subscribe(reportChannel(workerId));
    subscriber.on('message', ({ message }) => {
      try {
        const parsed: WorkerReportMessage =
          typeof message === 'string' ? JSON.parse(message) : message;
        void onReport(parsed);
      } catch {
        // Malformed report payload — ignore.
      }
    });
    return () => {
      void subscriber.unsubscribe();
    };
  }
}
