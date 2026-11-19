import crypto from "node:crypto";

const isProduction = process.env.NODE_ENV === "production";

let ephemeralDevSecret: string | null = null;

export function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured && configured.length >= 16) {
    return configured;
  }

  if (isProduction) {
    throw new Error(
      "JWT_SECRET must be set to a strong secret (>= 16 characters) in production.",
    );
  }

  if (!ephemeralDevSecret) {
    // Deterministic per-dev-instance fallback only outside production
    ephemeralDevSecret =
      configured ||
      crypto
        .createHash("sha256")
        .update(`focusflow-local-${process.env.SQL_DB_NAME || "dev"}`)
        .digest("hex");
    if (!configured) {
      console.warn(
        "[FocusFlow] JWT_SECRET not configured; using derived local development secret.",
      );
    }
  }
  return ephemeralDevSecret;
}

export function getAllowedCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  const defaults = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
  ];
  if (!raw) return defaults;
  const parsed = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return Array.from(new Set([...parsed, ...defaults]));
}

export function validateEnvironment(): void {
  if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16)) {
    throw new Error("Missing or weak JWT_SECRET in production environment.");
  }
}
