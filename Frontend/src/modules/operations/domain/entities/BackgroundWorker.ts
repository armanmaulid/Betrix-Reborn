export type WorkerStatus = 'running' | 'paused' | 'stopped' | 'idle' | 'error';
export type WorkerAction = 'start' | 'pause' | 'stop' | 'restart';
export type WorkerCategory = 'market' | 'news' | 'maintenance' | 'intelligence' | 'calendar';

export interface BackgroundWorkerProps {
  id: string;
  name: string;
  category: WorkerCategory;
  description: string;
  status: WorkerStatus;
  interval: string;
  uptimeSeconds?: number;
  lastRunAt?: string | Date | null;
  nextRunAt?: string | Date | null;
  processedCount?: number;
  errorCount?: number;
  lastError?: string | null;
}

/** Flat background worker info interface for presentation layer */
export interface BackgroundWorkerInfo {
  id: string;
  name: string;
  category: WorkerCategory;
  description: string;
  status: WorkerStatus;
  interval: string;
  uptimeSeconds: number;
  lastRunAt: string | Date | null;
  nextRunAt: string | Date | null;
  processedCount: number;
  errorCount: number;
  lastError: string | null;
  isRunning?: () => boolean;
  isPaused?: () => boolean;
  hasErrors?: () => boolean;
  getStatusBadgeClass?: () => string;
}

export class BackgroundWorker {
  public readonly id: string;
  public readonly name: string;
  public readonly category: WorkerCategory;
  public readonly description: string;
  public readonly status: WorkerStatus;
  public readonly interval: string;
  public readonly uptimeSeconds: number;
  public readonly lastRunAt: Date | null;
  public readonly nextRunAt: Date | null;
  public readonly processedCount: number;
  public readonly errorCount: number;
  public readonly lastError: string | null;

  constructor(props: BackgroundWorkerProps) {
    this.id = props.id;
    this.name = props.name;
    this.category = props.category;
    this.description = props.description;
    this.status = props.status;
    this.interval = props.interval;
    this.uptimeSeconds = props.uptimeSeconds ?? 0;
    this.lastRunAt = props.lastRunAt
      ? typeof props.lastRunAt === 'string'
        ? new Date(props.lastRunAt)
        : props.lastRunAt
      : null;
    this.nextRunAt = props.nextRunAt
      ? typeof props.nextRunAt === 'string'
        ? new Date(props.nextRunAt)
        : props.nextRunAt
      : null;
    this.processedCount = props.processedCount ?? 0;
    this.errorCount = props.errorCount ?? 0;
    this.lastError = props.lastError ?? null;
  }

  public isRunning(): boolean {
    return this.status === 'running';
  }

  public isPaused(): boolean {
    return this.status === 'paused';
  }

  public isStopped(): boolean {
    return this.status === 'stopped';
  }

  public hasErrors(): boolean {
    return this.errorCount > 0 || this.status === 'error';
  }

  public getStatusBadgeClass(): string {
    switch (this.status) {
      case 'running':
        return 'border-positive/40 bg-positive/10 text-positive';
      case 'paused':
        return 'border-accent/40 bg-accent/10 text-accent';
      case 'stopped':
        return 'border-negative/40 bg-negative/10 text-negative';
      default:
        return 'border-border bg-black text-muted-foreground';
    }
  }
}
