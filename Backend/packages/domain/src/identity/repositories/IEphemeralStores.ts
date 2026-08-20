import { Nullable } from '@betrix/core';

export interface ICaptchaStore {
  save(challengeId: string, answer: string, ttlSeconds?: number): Promise<void>;
  getAndDelete(challengeId: string): Promise<Nullable<string>>;
}

export interface IOAuthCodeStore {
  save(code: string, userId: string, ttlSeconds?: number): Promise<void>;
  getAndDelete(code: string): Promise<Nullable<string>>;
}

export interface IStreamTicketStore {
  save(ticket: string, userId: string, ttlSeconds?: number): Promise<void>;
  getAndDelete(ticket: string): Promise<Nullable<string>>;
}
