export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedApiResponse<T> extends ApiSuccessResponse<T[]> {
  pagination: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  code?: string;
  message: string;
  errors?: Record<string, string[]>;
}
