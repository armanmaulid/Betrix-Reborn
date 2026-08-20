import { Nullable } from '@betrix/core';
import { Session } from '../entities/Session.js';

export interface ISessionRepository {
  findById(id: string): Promise<Nullable<Session>>;
  findByToken(token: string): Promise<Nullable<Session>>;
  findByUserId(userId: string): Promise<Session[]>;
  save(session: Session): Promise<Session>;
  delete(token: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  deleteExpired(): Promise<number>;
}
