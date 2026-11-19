export interface ExtractedActionItem {
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

const CHECKBOX_RE = /^\s*(?:[-*+]\s*)?\[\s\]\s+(.+)$/;
const PREFIX_RE = /^\s*(?:[-*+]\s*)?(?:TODO|ACTION|TASK|FOLLOW[\s-]?UP)\s*:\s*(.+)$/i;
const HIGH_PRIORITY_RE = /\b(urgent\w*|asap|critical|blocker|today|high priority)\b|!{2,}/i;
const LOW_PRIORITY_RE = /\b(later|someday|optional|low priority|nice to have)\b/i;

function inferPriority(text: string): "LOW" | "MEDIUM" | "HIGH" {
  if (HIGH_PRIORITY_RE.test(text)) return "HIGH";
  if (LOW_PRIORITY_RE.test(text)) return "LOW";
  return "MEDIUM";
}

/**
 * Deterministically extracts actionable task candidates from note markdown/plain text.
 * Supports unchecked markdown checkboxes (`- [ ] ...`), `TODO:` / `ACTION:` / `TASK:` lines,
 * without requiring an external AI API.
 */
export function extractActionItemsFromNote(content: string): ExtractedActionItem[] {
  const lines = content.split(/\r?\n/);
  const seen = new Set<string>();
  const items: ExtractedActionItem[] = [];

  for (const rawLine of lines) {
    const checkboxMatch = rawLine.match(CHECKBOX_RE);
    const prefixMatch = rawLine.match(PREFIX_RE);
    const matchedText = (checkboxMatch?.[1] ?? prefixMatch?.[1])?.trim();

    if (!matchedText || matchedText.length < 2) continue;

    const cleanTitle = matchedText.replace(/\s+/g, " ").slice(0, 120);
    const dedupeKey = cleanTitle.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    items.push({
      title: cleanTitle,
      priority: inferPriority(cleanTitle),
    });
  }

  return items;
}
