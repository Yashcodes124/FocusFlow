export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  badRequest: (message: string, details?: Record<string, string[]>) =>
    new AppError(message, 400, "BAD_REQUEST", details),
  unauthorized: (message = "Authentication required") =>
    new AppError(message, 401, "UNAUTHORIZED"),
  forbidden: (message = "You do not have access to this resource") =>
    new AppError(message, 403, "FORBIDDEN"),
  notFound: (message = "Resource not found") =>
    new AppError(message, 404, "NOT_FOUND"),
  conflict: (message: string) => new AppError(message, 409, "CONFLICT"),
  tooManyRequests: (
    message = "Too many requests. Please try again later.",
    code = "RATE_LIMITED",
  ) => new AppError(message, 429, code),
  badGateway: (
    message = "Upstream service returned an invalid response.",
    code = "BAD_GATEWAY",
  ) => new AppError(message, 502, code),
  serviceUnavailable: (
    message = "Service is temporarily unavailable.",
    code = "SERVICE_UNAVAILABLE",
  ) => new AppError(message, 503, code),
};
