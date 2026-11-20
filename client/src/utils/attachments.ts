export const MAX_ATTACHMENTS_PER_TASK = 2;
export const MAX_ATTACHMENT_BYTES = 512 * 1024; // 512 KB

export const ATTACHMENT_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.markdown,.csv,.json";

const ALLOWED_MIME_TYPES = new Set([
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

const ALLOWED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".pdf",
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".json",
];

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb >= 100 ? `${Math.round(kb)} KB` : `${kb.toFixed(1)} KB`;
}

export function validateAttachmentFile(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (file.size <= 0) {
    return `"${file.name}" is empty and cannot be attached.`;
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `"${file.name}" exceeds the 512 KB quick-attachment limit.`;
  }

  const normalizedType = file.type.trim().toLowerCase();
  const lowerName = file.name.trim().toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext),
  );
  if (
    normalizedType &&
    normalizedType !== "application/octet-stream" &&
    !ALLOWED_MIME_TYPES.has(normalizedType)
  ) {
    return `"${file.name}" is not a supported quick-attachment type (PNG, JPG, WebP, GIF, PDF, TXT, MD, CSV, JSON).`;
  }
  if (!normalizedType || normalizedType === "application/octet-stream") {
    if (!hasAllowedExtension) {
      return `"${file.name}" is not a supported quick-attachment type (PNG, JPG, WebP, GIF, PDF, TXT, MD, CSV, JSON).`;
    }
  }

  return null;
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read "${file.name}".`));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error(`Could not read "${file.name}".`));
        return;
      }
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
