export type EventHandler<T = any> = (event: T) => Promise<void> | void;
export type DispatchErrorHandler = (eventName: string, err: unknown) => void;

/**
 * Domain event dispatcher for decoupled inter-context communication.
 * Instantiable — no singleton. Create via `new EventDispatcher()` at composition root.
 * Composition root injects `onError` so handler failures surface through the
 * process logger instead of an implicit console.
 */
export class EventDispatcher {
  private readonly handlers: Map<string, EventHandler[]> = new Map();

  constructor(private readonly onError?: DispatchErrorHandler) {}

  public register<T>(eventName: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventName) || [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
  }

  public async dispatch<T>(eventName: string, event: T): Promise<void> {
    const handlers = this.handlers.get(eventName);
    if (!handlers || handlers.length === 0) return;

    const promises = handlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (err) {
        if (this.onError) this.onError(eventName, err);
      }
    });

    await Promise.allSettled(promises);
  }

  public clear(): void {
    this.handlers.clear();
  }
}
