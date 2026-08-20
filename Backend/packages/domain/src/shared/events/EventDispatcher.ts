export type EventHandler<T = any> = (event: T) => Promise<void> | void;

/**
 * Domain event dispatcher for decoupled inter-context communication.
 * Instantiable — no singleton. Create via `new EventDispatcher()` at composition root.
 */
export class EventDispatcher {
  private readonly handlers: Map<string, EventHandler[]> = new Map();

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
        console.error(`[EventDispatcher] Error handling event "${eventName}":`, err);
      }
    });

    await Promise.allSettled(promises);
  }

  public clear(): void {
    this.handlers.clear();
  }
}
