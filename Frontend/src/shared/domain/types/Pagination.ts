/**
 * Standardized Pagination Interfaces
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}
