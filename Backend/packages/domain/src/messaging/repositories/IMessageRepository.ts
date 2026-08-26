import { Nullable, PaginatedResult, PaginationParams } from '@betrix/core';
import { Message, NotificationPreference } from '../entities/Message.js';

export interface IMessageRepository {
  save(message: Message): Promise<Message>;
  /** T4.6 — bulk insert for broadcast fan-out. */
  saveMany(messages: Message[]): Promise<number>;
  findById(id: string): Promise<Nullable<Message>>;
  findInbox(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Message>>;
  findSent(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Message>>;
  findThread(threadId: string, userId: string): Promise<Message[]>;
  markAsRead(id: string, userId: string): Promise<boolean>;
  softDelete(id: string, userId: string): Promise<boolean>;
  getNotificationPreference(userId: string): Promise<Nullable<NotificationPreference>>;
  saveNotificationPreference(pref: NotificationPreference): Promise<NotificationPreference>;
}
