export interface INotifier {
  broadcastGlobal(channel: 'market' | 'news', event: string, payload: unknown): void;
  broadcastToUser(userId: string, event: string, payload: unknown): void;
}
