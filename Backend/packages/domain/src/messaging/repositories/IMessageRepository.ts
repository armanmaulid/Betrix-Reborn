import { Nullable, PaginatedResult, PaginationParams } from '@betrix/core';
import { Message, NotificationPreference } from '../entities/Message.js';

export interface IMessageRepository {
  save(message: Message): Promise<Message>;
  findById(id: string): Promise<Nullable<Message>>;
  findInbox(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Message>>;
  findSent(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Message>>;
  findThread(threadId: string): Promise<Message[]>;
  markAsRead(id: string, userId: string): Promise<boolean>;
  softDelete(id: string, userId: string): Promise<boolean>;
  getNotificationPreference(userId: string): Promise<Nullable<NotificationPreference>>;
  saveNotificationPreference(pref: NotificationPreference): Promise<NotificationPreference>;
}
