export interface PaginatedList<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  warnings: string[];
}
