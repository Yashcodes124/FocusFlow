export interface SearchableTask {
  title: string;
  description?: string | null;
}

export interface HighlightSegment {
  text: string;
  matched: boolean;
}

export function tokenizeSearchQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Case-insensitive multi-term search across a task's title and description.
 * Every whitespace-separated term must appear in either the title or description.
 */
export function matchesTaskSearch(
  task: SearchableTask,
  query: string,
): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return true;

  const title = task.title.toLowerCase();
  const description = (task.description ?? "").toLowerCase();

  return tokens.every(
    (token) => title.includes(token) || description.includes(token),
  );
}

/**
 * Splits text into plain and matched segments for safe React highlighting
 * without dangerouslySetInnerHTML.
 */
export function splitHighlightSegments(
  text: string,
  query: string,
): HighlightSegment[] {
  if (!text) return [];
  const tokens = Array.from(new Set(tokenizeSearchQuery(query))).sort(
    (a, b) => b.length - a.length,
  );
  if (tokens.length === 0) {
    return [{ text, matched: false }];
  }

  const escaped = tokens.map((token) =>
    token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);

  const segments: HighlightSegment[] = [];
  for (const part of parts) {
    if (!part) continue;
    const lower = part.toLowerCase();
    const matched = tokens.some((token) => lower === token);
    segments.push({ text: part, matched });
  }
  return segments;
}

/**
 * Produces a concise description excerpt centered around the first matching
 * search term so description matches are immediately visible in compact rows.
 */
export function getDescriptionSnippet(
  description: string | null | undefined,
  query: string,
  maxLength = 140,
): string | null {
  const normalized = description?.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;

  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) {
    return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
  }

  const lower = normalized.toLowerCase();
  let firstMatchIndex = -1;
  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx !== -1 && (firstMatchIndex === -1 || idx < firstMatchIndex)) {
      firstMatchIndex = idx;
    }
  }

  if (firstMatchIndex === -1 || firstMatchIndex < maxLength - 40) {
    return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
  }

  const start = Math.max(0, firstMatchIndex - 32);
  const end = Math.min(normalized.length, start + maxLength - 2);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < normalized.length ? "…" : "";
  return `${prefix}${normalized.slice(start, end).trim()}${suffix}`;
}
