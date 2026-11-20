import axios, { isAxiosError } from "axios";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/+$/,
  "",
);

const TOKEN_STORAGE_KEY = "focusflow_token";

// In-memory Firebase ID token (never written to localStorage)
let inMemoryToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setInMemoryToken(token: string | null): void {
  inMemoryToken = token;
}

export function getStoredJwtToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredJwtToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function clearAllAuthTokens(): void {
  inMemoryToken = null;
  setStoredJwtToken(null);
  try {
    localStorage.removeItem("token");
  } catch {
    // Ignore
  }
}

export function getActiveAuthToken(): string | null {
  return inMemoryToken || getStoredJwtToken();
}

export function registerUnauthorizedHandler(handler: () => void): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getActiveAuthToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url || "";
      const isAuthEndpoint =
        url.includes("/users/login") || url.includes("/users/register");
      if (!isAuthEndpoint && unauthorizedHandler) {
        unauthorizedHandler();
      }
    }
    return Promise.reject(error);
  },
);

export function extractApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) {
    const data = error.response?.data;
    if (data?.errors) {
      const firstField = Object.values(data.errors).flat()[0];
      if (firstField) return firstField;
    }
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
