import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

function extractPgErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const direct = (error as { code?: unknown }).code;
  if (typeof direct === "string") return direct;
  const cause = (error as { cause?: unknown }).cause;
  if (typeof cause === "object" && cause !== null) {
    const nested = (cause as { code?: unknown }).code;
    if (typeof nested === "string") return nested;
  }
  return undefined;
}

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_form";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key]!.push(issue.message);
    }
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      errors: fieldErrors,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
  }

  const pgCode = extractPgErrorCode(err);
  if (pgCode === "23505") {
    return res.status(409).json({
      success: false,
      code: "CONFLICT",
      message: "A record with that value already exists",
    });
  }
  if (pgCode === "22P02") {
    return res.status(400).json({
      success: false,
      code: "INVALID_ID",
      message: "Invalid identifier format",
    });
  }
  if (pgCode === "23503") {
    return res.status(400).json({
      success: false,
      code: "INVALID_REFERENCE",
      message: "Referenced resource does not exist",
    });
  }

  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);

  return res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "An unexpected server error occurred",
  });
}

export function notFoundMiddleware(req: Request, res: Response) {
  return res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: `Route ${req.method} ${req.path} not found`,
  });
}
