import { GoogleGenAI } from "@google/genai";
import { AppError, Errors } from "./errors.js";

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw Errors.serviceUnavailable(
      "AI task decomposition is unavailable because GEMINI_API_KEY is not configured on the server.",
      "AI_SERVICE_UNAVAILABLE",
    );
  }

  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    cachedApiKey = apiKey;
  }

  return cachedClient;
}

export function classifyGeminiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const status =
    typeof error === "object" && error !== null
      ? Number(
          (error as { status?: unknown; statusCode?: unknown }).status ??
            (error as { statusCode?: unknown }).statusCode ??
            NaN,
        )
      : NaN;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const upper = message.toUpperCase();

  if (
    status === 429 ||
    upper.includes("RESOURCE_EXHAUSTED") ||
    upper.includes("RATE LIMIT") ||
    upper.includes("TOO MANY REQUESTS") ||
    upper.includes("QUOTA")
  ) {
    return Errors.tooManyRequests(
      "AI task decomposition is currently rate-limited. Please wait a moment and try again.",
      "AI_RATE_LIMITED",
    );
  }

  if (
    status === 401 ||
    status === 403 ||
    upper.includes("API_KEY_INVALID") ||
    upper.includes("PERMISSION_DENIED") ||
    upper.includes("UNAUTHENTICATED")
  ) {
    return Errors.serviceUnavailable(
      "AI task decomposition is unavailable due to an invalid or unauthorized Gemini API key.",
      "AI_SERVICE_UNAVAILABLE",
    );
  }

  if (
    status === 503 ||
    status === 504 ||
    upper.includes("UNAVAILABLE") ||
    upper.includes("DEADLINE_EXCEEDED") ||
    upper.includes("ECONNREFUSED") ||
    upper.includes("FETCH FAILED")
  ) {
    return Errors.serviceUnavailable(
      "The AI service is temporarily unreachable. Please try again shortly.",
      "AI_SERVICE_UNAVAILABLE",
    );
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(
      `[FocusFlow AI] Upstream Gemini error (status=${Number.isNaN(status) ? "unknown" : status}): ${message.slice(0, 300)}`,
    );
  }

  return Errors.badGateway(
    "Failed to generate task breakdown from the AI service. Please try again.",
    "AI_UPSTREAM_ERROR",
  );
}
