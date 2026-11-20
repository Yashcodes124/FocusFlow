import { z } from "zod";
import { Errors } from "../lib/errors.js";

export const POMODORO_MINUTES = 25;

const optionalTargetDateSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }
    return value;
  },
  z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "targetDate must be YYYY-MM-DD or an ISO date string"),
      z.string().datetime({ offset: true }),
      z.null(),
    ])
    .refine(
      (val) => {
        if (!val) return true;
        const parsed = /^\d{4}-\d{2}-\d{2}$/.test(val)
          ? new Date(`${val}T12:00:00.000Z`)
          : new Date(val);
        return !Number.isNaN(parsed.getTime());
      },
      { message: "targetDate must be a valid calendar date" },
    )
    .optional(),
);

export const decomposeTaskRequestSchema = z.object({
  goal: z
    .string({ error: "Goal is required" })
    .trim()
    .min(5, "Goal must be at least 5 characters")
    .max(300, "Goal must be 300 characters or fewer"),
  targetDate: optionalTargetDateSchema,
  autoCreate: z.boolean().optional().default(false),
});

export const aiSubtaskPrioritySchema = z.enum(["low", "medium", "high"]);

export const aiDecomposeSubtaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Subtask title is required")
    .max(140, "Subtask title must be 140 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(2000, "Subtask description must be 2000 characters or fewer"),
  estimatedPomodoros: z.coerce.number().int().min(1).max(4),
  priority: z.preprocess(
    (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
    aiSubtaskPrioritySchema,
  ),
  suggestedCategoryId: z.string().trim().min(1).nullable().optional().default(null),
  suggestedDueDate: z
    .string()
    .trim()
    .min(10, "suggestedDueDate must be an ISO date string"),
});

export const aiDecomposeOutputSchema = z.object({
  strategySummary: z
    .string()
    .trim()
    .min(1, "strategySummary is required")
    .max(400, "strategySummary must be 400 characters or fewer"),
  subtasks: z
    .array(aiDecomposeSubtaskSchema)
    .min(3, "AI breakdown must contain at least 3 subtasks")
    .max(6, "AI breakdown must contain at most 6 subtasks"),
});

export type DecomposeTaskRequest = z.infer<typeof decomposeTaskRequestSchema>;
export type AiSubtaskPriority = z.infer<typeof aiSubtaskPrioritySchema>;
export type AiDecomposeSubtask = z.infer<typeof aiDecomposeSubtaskSchema>;
export type AiDecomposeOutput = z.infer<typeof aiDecomposeOutputSchema>;

export interface WorkspaceContextForAi {
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  pendingTaskCount: number;
  todayIsoDate: string;
}

export function pomodorosToMinutes(pomodoros: number): number {
  const clamped = Math.max(1, Math.min(4, Math.round(pomodoros)));
  return clamped * POMODORO_MINUTES;
}

export function normalizeIsoDateOnly(
  rawDate: string | null | undefined,
  fallbackIsoDate: string,
): string {
  if (!rawDate) return fallbackIsoDate;
  const trimmed = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00.000Z`);
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === trimmed) {
      return trimmed;
    }
    return fallbackIsoDate;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackIsoDate;
  }
  return parsed.toISOString().slice(0, 10);
}

export function buildDecomposeSystemInstruction(): string {
  return [
    "You are FocusFlow's senior productivity architect and execution planner.",
    "Break a user's broad goal into 3 to 6 concrete, ordered, actionable subtasks that can each be completed in 1 to 4 Pomodoro blocks (25 minutes per Pomodoro).",
    "Requirements:",
    "- strategySummary: exactly one concise, practical sentence explaining the sequencing approach.",
    "- subtasks: 3 to 6 distinct items, ordered from foundational work to final verification.",
    "- title: clear imperative verb phrase under 100 characters.",
    "- description: concrete acceptance criteria or implementation notes (1-2 sentences).",
    "- estimatedPomodoros: integer 1, 2, 3, or 4.",
    "- priority: strictly lowercase 'low', 'medium', or 'high'.",
    "- suggestedCategoryId: MUST be an exact ID from the user's provided categories list if relevant, or null if no category fits or the user has no categories. Never invent an ID.",
    "- suggestedDueDate: ISO date string (YYYY-MM-DD) paced realistically from today up to the targetDate (if provided), accounting for the user's current pending task workload.",
    "Return valid JSON strictly conforming to the schema.",
  ].join("\n");
}

export function buildDecomposeUserPrompt(
  input: Pick<DecomposeTaskRequest, "goal" | "targetDate">,
  context: WorkspaceContextForAi,
): string {
  const categoryLines =
    context.categories.length > 0
      ? context.categories.map((c) => `  - id="${c.id}" name="${c.name}"`).join("\n")
      : "  - (none configured; always set suggestedCategoryId to null)";

  const tagLines =
    context.tags.length > 0
      ? context.tags.map((t) => `#${t.name}`).join(", ")
      : "(none)";

  const normalizedTarget = input.targetDate
    ? normalizeIsoDateOnly(input.targetDate, context.todayIsoDate)
    : "not specified (pace over the next 3-7 days)";

  return [
    `Goal: ${input.goal}`,
    `Today's date (UTC): ${context.todayIsoDate}`,
    `Target completion date: ${normalizedTarget}`,
    `User's current pending tasks: ${context.pendingTaskCount}`,
    "User's existing categories:",
    categoryLines,
    `User's existing tags: ${tagLines}`,
    "Generate the structured JSON breakdown now.",
  ].join("\n");
}

export function stripMarkdownJsonFence(rawText: string): string {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1]!.trim() : trimmed;
}

export function parseAndNormalizeDecomposeResponse(
  rawText: string | undefined,
  validCategoryIds: Set<string>,
  fallbackIsoDate: string,
): AiDecomposeOutput {
  if (!rawText || rawText.trim().length === 0) {
    throw Errors.badGateway(
      "AI service returned an empty response. Please try again.",
      "AI_INVALID_RESPONSE",
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripMarkdownJsonFence(rawText));
  } catch {
    throw Errors.badGateway(
      "AI service returned malformed JSON. Please try again.",
      "AI_INVALID_RESPONSE",
    );
  }

  const result = aiDecomposeOutputSchema.safeParse(parsedJson);
  if (!result.success) {
    throw Errors.badGateway(
      "AI service returned a breakdown that did not match the expected structure. Please try again.",
      "AI_INVALID_RESPONSE",
    );
  }

  return {
    strategySummary: result.data.strategySummary,
    subtasks: result.data.subtasks.map((item) => ({
      ...item,
      suggestedCategoryId:
        item.suggestedCategoryId && validCategoryIds.has(item.suggestedCategoryId)
          ? item.suggestedCategoryId
          : null,
      suggestedDueDate: normalizeIsoDateOnly(
        item.suggestedDueDate,
        fallbackIsoDate,
      ),
    })),
  };
}
