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

/**
 * Generic paginated mapper — eliminates copy-paste `toDomainPaginated` across all mappers.
 * Usage: `toDomainPaginated(raw, MyMapper.toDomain)`
 */
export function toDomainPaginated<TDto, TDomain>(
  paginatedDto: { data?: TDto[]; meta?: PaginationMeta } | TDto[],
  mapItem: (dto: TDto) => TDomain
): PaginatedResult<TDomain> {
  const wrapped = Array.isArray(paginatedDto) ? undefined : paginatedDto;
  const rawItems: TDto[] = Array.isArray(wrapped?.data)
    ? wrapped.data
    : Array.isArray(paginatedDto)
      ? paginatedDto
      : [];
  const meta: PaginationMeta = wrapped?.meta || {
    page: 1,
    limit: rawItems.length,
    total: rawItems.length,
    totalPages: 1
  };
  return { data: rawItems.map(mapItem), meta };
}
