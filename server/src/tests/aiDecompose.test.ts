import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDecomposeSystemInstruction,
  buildDecomposeUserPrompt,
  decomposeTaskRequestSchema,
  normalizeIsoDateOnly,
  parseAndNormalizeDecomposeResponse,
  pomodorosToMinutes,
  stripMarkdownJsonFence,
} from "../validators/ai.validator.js";
import { bulkCreateTasksSchema } from "../validators/task.validator.js";
import { classifyGeminiError } from "../lib/gemini.js";

test("decomposeTaskRequestSchema validates goal length, optional targetDate, and autoCreate default", () => {
  assert.throws(() => decomposeTaskRequestSchema.parse({ goal: "hi" }));
  assert.throws(() =>
    decomposeTaskRequestSchema.parse({ goal: "a".repeat(301) }),
  );
  assert.throws(() =>
    decomposeTaskRequestSchema.parse({
      goal: "Build role-based access control",
      targetDate: "not-a-date",
    }),
  );

  const valid = decomposeTaskRequestSchema.parse({
    goal: "  Build authentication and role-based access control  ",
    targetDate: "2026-12-01",
  });
  assert.equal(valid.goal, "Build authentication and role-based access control");
  assert.equal(valid.targetDate, "2026-12-01");
  assert.equal(valid.autoCreate, false);

  const emptyDate = decomposeTaskRequestSchema.parse({
    goal: "Ship onboarding checklist",
    targetDate: "",
    autoCreate: true,
  });
  assert.equal(emptyDate.targetDate, undefined);
  assert.equal(emptyDate.autoCreate, true);
});

test("buildDecomposeUserPrompt embeds workspace categories, tags, and pending task count", () => {
  const systemInstruction = buildDecomposeSystemInstruction();
  assert.match(systemInstruction, /3 to 6/);
  assert.match(systemInstruction, /suggestedCategoryId/);

  const prompt = buildDecomposeUserPrompt(
    {
      goal: "Build authentication and RBAC",
      targetDate: "2026-12-05",
    },
    {
      categories: [{ id: "cat-eng-1", name: "Engineering" }],
      tags: [{ id: "tag-sec-1", name: "security" }],
      pendingTaskCount: 7,
      todayIsoDate: "2026-11-20",
    },
  );

  assert.match(prompt, /Build authentication and RBAC/);
  assert.match(prompt, /2026-12-05/);
  assert.match(prompt, /pending tasks: 7/i);
  assert.match(prompt, /id="cat-eng-1" name="Engineering"/);
  assert.match(prompt, /#security/);
});

test("parseAndNormalizeDecomposeResponse parses fenced JSON, sanitizes unknown category IDs, and normalizes dates", () => {
  const validCategoryIds = new Set(["11111111-1111-4111-8111-111111111111"]);
  const raw = [
    "```json",
    JSON.stringify({
      strategySummary:
        "Sequence schema and auth middleware first, then layer role guards and tests.",
      subtasks: [
        {
          title: "Design roles and permissions schema",
          description: "Add roles table and user role foreign key in Drizzle.",
          estimatedPomodoros: 2,
          priority: "HIGH",
          suggestedCategoryId: "11111111-1111-4111-8111-111111111111",
          suggestedDueDate: "2026-11-22",
        },
        {
          title: "Implement JWT middleware and refresh flow",
          description: "Verify access tokens and reject revoked sessions.",
          estimatedPomodoros: 3,
          priority: "high",
          suggestedCategoryId: "99999999-9999-4999-8999-999999999999",
          suggestedDueDate: "2026-11-24T15:00:00.000Z",
        },
        {
          title: "Add RBAC unit and route guard tests",
          description: "Cover admin, member, and unauthorized roles.",
          estimatedPomodoros: 2,
          priority: "medium",
          suggestedCategoryId: null,
          suggestedDueDate: "invalid-date-string",
        },
      ],
    }),
    "```",
  ].join("\n");

  assert.equal(stripMarkdownJsonFence("```json\n{\"a\":1}\n```"), '{"a":1}');
  assert.equal(pomodorosToMinutes(3), 75);
  assert.equal(normalizeIsoDateOnly("2026-11-25T10:00:00Z", "2026-11-20"), "2026-11-25");

  const parsed = parseAndNormalizeDecomposeResponse(
    raw,
    validCategoryIds,
    "2026-11-28",
  );

  assert.equal(parsed.subtasks.length, 3);
  assert.equal(parsed.subtasks[0]!.priority, "high");
  assert.equal(
    parsed.subtasks[0]!.suggestedCategoryId,
    "11111111-1111-4111-8111-111111111111",
  );
  // Unknown/hallucinated category ID must be sanitized to null
  assert.equal(parsed.subtasks[1]!.suggestedCategoryId, null);
  assert.equal(parsed.subtasks[1]!.suggestedDueDate, "2026-11-24");
  // Unparseable date safely falls back to target/today date
  assert.equal(parsed.subtasks[2]!.suggestedDueDate, "2026-11-28");
});

test("parseAndNormalizeDecomposeResponse rejects malformed JSON or out-of-range subtask counts", () => {
  const emptySet = new Set<string>();
  assert.throws(
    () => parseAndNormalizeDecomposeResponse("not-json", emptySet, "2026-11-20"),
    (err: unknown) => (err as { statusCode?: number }).statusCode === 502,
  );
  assert.throws(
    () =>
      parseAndNormalizeDecomposeResponse(
        JSON.stringify({
          strategySummary: "Too few subtasks",
          subtasks: [
            {
              title: "Only one",
              description: "Not enough",
              estimatedPomodoros: 1,
              priority: "low",
              suggestedCategoryId: null,
              suggestedDueDate: "2026-11-21",
            },
          ],
        }),
        emptySet,
        "2026-11-20",
      ),
    (err: unknown) => (err as { statusCode?: number }).statusCode === 502,
  );
});

test("bulkCreateTasksSchema and classifyGeminiError handle batch bounds and upstream 429/503 errors", () => {
  assert.throws(() => bulkCreateTasksSchema.parse({ tasks: [] }));

  const validBulk = bulkCreateTasksSchema.parse({
    tasks: [
      {
        title: "Write migration",
        priority: "high",
        estimatedMinutes: 50,
      },
    ],
  });
  assert.equal(validBulk.tasks.length, 1);

  const rateLimited = classifyGeminiError({
    status: 429,
    message: "RESOURCE_EXHAUSTED: Quota exceeded",
  });
  assert.equal(rateLimited.statusCode, 429);
  assert.equal(rateLimited.code, "AI_RATE_LIMITED");

  const unavailable = classifyGeminiError({
    status: 403,
    message: "API_KEY_INVALID",
  });
  assert.equal(unavailable.statusCode, 503);
  assert.equal(unavailable.code, "AI_SERVICE_UNAVAILABLE");
});
