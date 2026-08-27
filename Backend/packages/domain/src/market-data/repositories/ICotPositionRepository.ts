import { CotPosition } from '../entities/CotPosition.js';

export interface CotPositionQuery {
  currency?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface ICotPositionRepository {
  saveMany(rows: CotPosition[]): Promise<number>;
  upsertOne(row: CotPosition): Promise<CotPosition>;
  findById(id: string): Promise<CotPosition | null>;
  findMany(query: CotPositionQuery): Promise<CotPosition[]>;
  findLatest(currency: string): Promise<CotPosition | null>;
  countForCurrency(currency: string): Promise<number>;
}
