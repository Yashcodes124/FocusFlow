import { z } from "zod";
import { Errors } from "../lib/errors.js";

export const MAX_ATTACHMENTS_PER_TASK = 2;
export const MAX_ATTACHMENT_BYTES = 512 * 1024; // 512 KB

export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

export function sanitizeAttachmentFileName(rawName: string): string {
  const base = rawName
    .replace(/^.*[\\/]/, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f<>:"|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  if (!base || base === "." || base === "..") {
    return "attachment";
  }
  return base.slice(0, 120);
}

export function normalizeAttachmentMimeType(
  rawMimeType: string,
  fileName: string,
): string {
  const normalized = rawMimeType.trim().toLowerCase().split(";")[0]?.trim() ?? "";
  if (normalized && normalized !== "application/octet-stream") {
    return normalized;
  }

  // Fallback for browsers that leave .md/.txt/.json/.csv MIME empty or octet-stream
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) {
    return "text/markdown";
  }
  if (lowerName.endsWith(".txt")) return "text/plain";
  if (lowerName.endsWith(".csv")) return "text/csv";
  if (lowerName.endsWith(".json")) return "application/json";
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".gif")) return "image/gif";
  return normalized || "application/octet-stream";
}

export function decodeAndValidateBase64(dataBase64: string): {
  buffer: Buffer;
  normalizedBase64: string;
  sizeBytes: number;
} {
  const stripped = dataBase64
    .trim()
    .replace(/^data:[^;]+;base64,/i, "")
    .replace(/\s+/g, "");

  if (
    stripped.length === 0 ||
    stripped.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(stripped)
  ) {
    throw Errors.badRequest("Invalid base64 attachment payload");
  }

  // Guard before allocating large buffers
  const estimatedBytes = Math.floor((stripped.length * 3) / 4);
  if (estimatedBytes > MAX_ATTACHMENT_BYTES + 4) {
    throw Errors.badRequest("Attachment exceeds the 512 KB size limit");
  }

  const buffer = Buffer.from(stripped, "base64");
  if (buffer.length === 0) {
    throw Errors.badRequest("Attachment file cannot be empty");
  }
  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    throw Errors.badRequest("Attachment exceeds the 512 KB size limit");
  }

  return {
    buffer,
    normalizedBase64: buffer.toString("base64"),
    sizeBytes: buffer.length,
  };
}

export const createAttachmentSchema = z.object({
  fileName: z
    .string({ error: "File name is required" })
    .trim()
    .min(1, "File name is required")
    .max(200, "File name is too long"),
  mimeType: z.string().trim().max(120).optional().default(""),
  dataBase64: z
    .string({ error: "File contents are required" })
    .min(1, "File contents are required")
    .max(750_000, "Attachment exceeds the 512 KB size limit"),
});

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;
