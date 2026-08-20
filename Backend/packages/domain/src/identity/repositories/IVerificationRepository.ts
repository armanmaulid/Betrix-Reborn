import { Nullable } from '@betrix/core';

export interface VerificationRecord {
  id: string;
  userId: string;
  token: string;
  type: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IVerificationRepository {
  create(userId: string, token: string, type: string, ttlMinutes?: number): Promise<VerificationRecord>;
  verify(token: string, type: string): Promise<Nullable<VerificationRecord>>;
  invalidateUserTokens(userId: string, type: string): Promise<number>;
  cleanupExpired(): Promise<number>;
}
