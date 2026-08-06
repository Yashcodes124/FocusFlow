//shared/types/api.ts

/**
 * Generic api response
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  statusCode: number;
  date?: T;
}
/**
 * Paginated response
 * returns list of items
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  currentPage: number;
  totalPages: number;
  totoalItems: number;
}

/**
 * List response
 */
export interface ApiListResponse<T> extends ApiResponse<T[]> {
  totalItems: number;
}

/**
 * Standard API error
 * api don't return any data info
 */
export interface ApiError {
  success: boolean;
  message: string;
  statusCode: number;
  error?: Record<string, string[]>;
}
