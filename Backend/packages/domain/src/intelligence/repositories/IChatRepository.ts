import { PaginatedResult, PaginationParams } from '@betrix/core';
import { ChatMessage } from '../entities/ChatMessage.js';

export interface IChatRepository {
  save(message: ChatMessage): Promise<ChatMessage>;
  findByUserId(userId: string, pagination: PaginationParams): Promise<PaginatedResult<ChatMessage>>;
  findBySessionId(sessionId: string, userId: string): Promise<ChatMessage[]>;
  /** Last N messages of a session in chronological order — AI context window. */
  findRecentBySessionId(sessionId: string, userId: string, limit: number): Promise<ChatMessage[]>;
  deleteSession(sessionId: string, userId: string): Promise<number>;
  /** T4.5 — purge chat messages created before the cutoff (retention). */
  deleteOlderThan(cutoff: Date): Promise<number>;
}
