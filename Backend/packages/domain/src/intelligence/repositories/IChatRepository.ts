import { Nullable, PaginatedResult, PaginationParams } from '@betrix/core';
import { ChatMessage } from '../entities/ChatMessage.js';

export interface IChatRepository {
  save(message: ChatMessage): Promise<ChatMessage>;
  findByUserId(userId: string, pagination: PaginationParams): Promise<PaginatedResult<ChatMessage>>;
  findBySessionId(sessionId: string, userId: string): Promise<ChatMessage[]>;
  deleteSession(sessionId: string, userId: string): Promise<number>;
  findRecentByUserId(userId: string, limit?: number): Promise<ChatMessage[]>;
}
