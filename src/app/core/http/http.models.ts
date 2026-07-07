export interface GenericResponse<T> {
  success: boolean;
  response: string;
  statusCode: number;
  value: T | null;
  errors: string[];
}

export interface PaginatedCount {
  items: Array<Record<string, unknown>>;
  totalItems: number;
  totalPages: number;
  warnings: string[];
}

export interface Filter {
  field: string;
  operator: number;
  value: unknown;
}

export interface OrderBy {
  field: string;
  ascending: boolean;
}

export interface Pagination {
  pageNumber: number;
  pageSize: number;
}

export interface SearchRequest {
  filters?: Filter[];
  orderBy?: OrderBy;
  select?: string[];
  pagination?: Pagination;
  pageNumber?: number;
  pageSize?: number;
  orderByField?: string;
  orderByAscending?: boolean;
}

export interface ReportRequest {
  filters?: Filter[];
  entity: string;
  period?: string | number;
  startDate?: string;
  endDate?: string;
  aggregation?: string | number;
  valueField?: string;
  groupField?: string;
  seriesField?: string;
  chartType?: string;
}
