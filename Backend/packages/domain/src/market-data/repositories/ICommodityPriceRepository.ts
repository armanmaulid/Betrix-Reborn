import { CommodityPrice } from '../entities/CommodityPrice.js';

export interface CommodityPriceQuery {
  indicator?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface ICommodityPriceRepository {
  saveMany(rows: CommodityPrice[]): Promise<number>;
  upsertOne(row: CommodityPrice): Promise<CommodityPrice>;
  findById(id: string): Promise<CommodityPrice | null>;
  findMany(query: CommodityPriceQuery): Promise<CommodityPrice[]>;
  findLatest(indicator: string): Promise<CommodityPrice | null>;
  countForIndicator(indicator: string): Promise<number>;
}
