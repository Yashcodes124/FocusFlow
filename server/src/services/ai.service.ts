import { ThinkingLevel, Type, type Schema } from "@google/genai";
import { classifyGeminiError, getGeminiClient } from "../lib/gemini.js";
import {
  countPendingTasksByUser,
  type HydratedTask,
} from "../repositories/task.repository.js";
import {
  listCategoriesByUser,
  listTagsByUser,
} from "../repositories/taxonomy.repository.js";
import { createTasksBulkService } from "./task.service.js";
import {
  buildDecomposeSystemInstruction,
  buildDecomposeUserPrompt,
  normalizeIsoDateOnly,
  parseAndNormalizeDecomposeResponse,
  pomodorosToMinutes,
  type AiDecomposeOutput,
  type DecomposeTaskRequest,
  type WorkspaceContextForAi,
} from "../validators/ai.validator.js";

export const AI_DECOMPOSE_MODEL = "gemini-4-hydrogen";

const DECOMPOSE_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    strategySummary: {
      type: Type.STRING,
      description: "Brief 1-sentence breakdown approach for the goal.",
    },
    subtasks: {
      type: Type.ARRAY,
      description: "Ordered list of 3 to 6 concrete subtasks.",
      minItems: "3",
      maxItems: "6",
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "Actionable imperative subtask title.",
          },
          description: {
            type: Type.STRING,
            description: "Concise implementation notes or acceptance criteria.",
          },
          estimatedPomodoros: {
            type: Type.INTEGER,
            description: "Estimated Pomodoro sessions (25m each), integer from 1 to 4.",
          },
          priority: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
            description: "Task priority level: low, medium, or high.",
          },
          suggestedCategoryId: {
            type: Type.STRING,
            nullable: true,
            description:
              "Matching category UUID from the user's workspace categories, or null if none fit.",
          },
          suggestedDueDate: {
            type: Type.STRING,
            description: "Recommended ISO date string (YYYY-MM-DD).",
          },
        },
        required: [
          "title",
          "description",
          "estimatedPomodoros",
          "priority",
          "suggestedCategoryId",
          "suggestedDueDate",
        ],
      },
    },
  },
  required: ["strategySummary", "subtasks"],
};

export interface DecomposeGeneratorParams {
  model: string;
  systemInstruction: string;
  userPrompt: string;
  workspaceContext: WorkspaceContextForAi;
}

export type DecomposeGenerator = (
  params: DecomposeGeneratorParams,
) => Promise<string | undefined>;

let testGeneratorOverride: DecomposeGenerator | null = null;

/**
 * Test-only hook for injecting a mocked Gemini generator in integration tests.
 */
export function setAiDecomposeGeneratorForTest(
  generator: DecomposeGenerator | null,
): void {
  testGeneratorOverride = generator;
}

async function generateWithGemini({
  model,
  systemInstruction,
  userPrompt,
}: DecomposeGeneratorParams): Promise<string | undefined> {
  const ai = getGeminiClient();
  const useThinkingLevel =
    model.startsWith("gemini-4-") || model.startsWith("gemini-3");
  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: DECOMPOSE_RESPONSE_SCHEMA,
      ...(useThinkingLevel
        ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
        : {}),
    },
  });
  return response.text;
}

export interface DecomposeTaskResult extends AiDecomposeOutput {
  workspaceContext: {
    pendingTaskCount: number;
    categoriesCount: number;
    tagsCount: number;
  };
  createdTasks?: HydratedTask[];
}

export async function decomposeTaskGoalService(
  userId: string,
  input: DecomposeTaskRequest,
): Promise<DecomposeTaskResult> {
  const [userCategories, userTags, pendingTaskCount] = await Promise.all([
    listCategoriesByUser(userId),
    listTagsByUser(userId),
    countPendingTasksByUser(userId),
  ]);

  const todayIsoDate = new Date().toISOString().slice(0, 10);
  const workspaceContext: WorkspaceContextForAi = {
    categories: userCategories.map((c) => ({ id: c.id, name: c.name })),
    tags: userTags.map((t) => ({ id: t.id, name: t.name })),
    pendingTaskCount,
    todayIsoDate,
  };

  const systemInstruction = buildDecomposeSystemInstruction();
  const userPrompt = buildDecomposeUserPrompt(input, workspaceContext);

  const resolvedModel = process.env.GEMINI_MODEL?.trim() || AI_DECOMPOSE_MODEL;
  const generator = testGeneratorOverride ?? generateWithGemini;
  let rawText: string | undefined;
  try {
    rawText = await generator({
      model: resolvedModel,
      systemInstruction,
      userPrompt,
      workspaceContext,
    });
  } catch (error) {
    throw classifyGeminiError(error);
  }

  const validCategoryIds = new Set(userCategories.map((c) => c.id));
  const fallbackIsoDate = normalizeIsoDateOnly(input.targetDate, todayIsoDate);

  const parsed = parseAndNormalizeDecomposeResponse(
    rawText,
    validCategoryIds,
    fallbackIsoDate,
  );

  let createdTasks: HydratedTask[] | undefined;
  if (input.autoCreate) {
    createdTasks = await createTasksBulkService(
      parsed.subtasks.map((subtask) => ({
        title: subtask.title,
        description: subtask.description,
        priority: subtask.priority,
        status: "TODO" as const,
        categoryId: subtask.suggestedCategoryId,
        dueDate: subtask.suggestedDueDate,
        estimatedMinutes: pomodorosToMinutes(subtask.estimatedPomodoros),
        isImportant: subtask.priority === "high",
        tagIds: [],
      })),
      userId,
    );
  }

  return {
    strategySummary: parsed.strategySummary,
    subtasks: parsed.subtasks,
    workspaceContext: {
      pendingTaskCount,
      categoriesCount: userCategories.length,
      tagsCount: userTags.length,
    },
    ...(createdTasks ? { createdTasks } : {}),
  };
}
