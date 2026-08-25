import { ValidationError } from '@betrix/core';

export type WorkerStatus = 'running' | 'paused' | 'stopped' | 'idle' | 'error';
export type WorkerAction = 'start' | 'pause' | 'stop' | 'restart';
export type WorkerCategory = 'market' | 'news' | 'maintenance' | 'intelligence' | 'calendar';

export interface BackgroundWorkerProps {
  id: string;
  name: string;
  category: WorkerCategory;
  description: string;
  status?: WorkerStatus;
  interval: string;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  processedCount?: number;
  errorCount?: number;
  lastError?: string | null;
  startedAt?: Date | null;
}

/**
 * Rich Domain Entity representing a managed Background Worker subsystem.
 * Encapsulates state transition invariants and lifecycle telemetry (DDD Admin Context).
 */
export class BackgroundWorker {
  public readonly id: string;
  public readonly name: string;
  public readonly category: WorkerCategory;
  public readonly description: string;
  public readonly interval: string;

  private _status: WorkerStatus;
  private _lastRunAt: string | null;
  private _nextRunAt: string | null;
  private _processedCount: number;
  private _errorCount: number;
  private _lastError: string | null;
  private _startedAt: Date | null;

  constructor(props: BackgroundWorkerProps) {
    if (!props.id || !props.name) {
      throw new ValidationError('BackgroundWorker must have a valid id and name');
    }

    this.id = props.id;
    this.name = props.name;
    this.category = props.category;
    this.description = props.description;
    this.interval = props.interval;

    this._status = props.status ?? 'running';
    this._lastRunAt = props.lastRunAt ?? new Date().toISOString();
    this._nextRunAt = props.nextRunAt ?? null;
    this._processedCount = props.processedCount ?? 0;
    this._errorCount = props.errorCount ?? 0;
    this._lastError = props.lastError ?? null;
    this._startedAt = props.startedAt ?? (this._status === 'running' ? new Date() : null);
  }

  public get status(): WorkerStatus {
    return this._status;
  }

  public get lastRunAt(): string | null {
    return this._lastRunAt;
  }

  public get nextRunAt(): string | null {
    return this._nextRunAt;
  }

  public get processedCount(): number {
    return this._processedCount;
  }

  public get errorCount(): number {
    return this._errorCount;
  }

  public get lastError(): string | null {
    return this._lastError;
  }

  public get uptimeSeconds(): number {
    if (this._status !== 'running' || !this._startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - this._startedAt.getTime()) / 1000));
  }

  // --- Domain State Invariants ---

  public start(): void {
    const now = new Date();
    this._status = 'running';
    this._startedAt = now;
    this._lastRunAt = now.toISOString();
  }

  public pause(): void {
    this._status = 'paused';
    this._startedAt = null;
  }

  public stop(): void {
    this._status = 'stopped';
    this._startedAt = null;
  }

  public restart(): void {
    const now = new Date();
    this._status = 'running';
    this._startedAt = now;
    this._lastRunAt = now.toISOString();
    this._processedCount += 1;
  }

  public recordExecution(delta: number = 1, nextRunDate?: Date): void {
    this._lastRunAt = new Date().toISOString();
    this._processedCount += delta;
    if (nextRunDate) {
      this._nextRunAt = nextRunDate.toISOString();
    }
  }

  public recordError(error: string): void {
    this._errorCount += 1;
    this._lastError = error;
    this._status = 'error';
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      description: this.description,
      status: this._status,
      interval: this.interval,
      uptimeSeconds: this.uptimeSeconds,
      lastRunAt: this._lastRunAt,
      nextRunAt: this._nextRunAt,
      processedCount: this._processedCount,
      errorCount: this._errorCount,
      lastError: this._lastError
    };
  }
}
