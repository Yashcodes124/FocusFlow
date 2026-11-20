process.env.NODE_ENV = "test";

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import app from "../app.js";
import { deleteUserById } from "../repositories/user.repository.js";
import {
  setAiDecomposeGeneratorForTest,
  type DecomposeGeneratorParams,
} from "../services/ai.service.js";
import { pool } from "../../../src/db/index.js";

let server: Server;
let baseUrl = "";
const createdUserIds: string[] = [];

async function apiRequest(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {},
) {
  const headers: Record<string, string> = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body: json };
}

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  setAiDecomposeGeneratorForTest(null);
  for (const id of createdUserIds) {
    try {
      await deleteUserById(id);
    } catch {
      // Ignore cleanup errors
    }
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});

test("AI Task Decomposer & atomic bulk task creation integration with PostgreSQL", async () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const email = `ai-decomposer-${suffix}@example.com`;
  const password = "StrongPassword123";

  // 1. Register user
  const reg = await apiRequest("/api/users/register", {
    method: "POST",
    body: { name: "Maya Patel", email, password },
  });
  assert.equal(reg.status, 201);
  const user = reg.body.user as { id: string };
  const token = reg.body.token as string;
  createdUserIds.push(user.id);

  // 2. Seed workspace context: 1 category, 1 tag, 2 pending tasks
  const catRes = await apiRequest("/api/categories", {
    method: "POST",
    token,
    body: { name: "Backend", color: "#2563EB" },
  });
  assert.equal(catRes.status, 201);
  const category = catRes.body.data as { id: string; name: string };

  const tagRes = await apiRequest("/api/tags", {
    method: "POST",
    token,
    body: { name: "security", color: "#059669" },
  });
  assert.equal(tagRes.status, 201);

  for (const title of ["Existing pending task 1", "Existing pending task 2"]) {
    const tRes = await apiRequest("/api/tasks", {
      method: "POST",
      token,
      body: { title, priority: "MEDIUM" },
    });
    assert.equal(tRes.status, 201);
  }

  // 3. Reject invalid goal (< 5 chars)
  const badReq = await apiRequest("/api/ai/decompose-task", {
    method: "POST",
    token,
    body: { goal: "abc" },
  });
  assert.equal(badReq.status, 400);
  assert.equal(badReq.body.code, "VALIDATION_ERROR");

  // 4. Mock Gemini generator: verify workspace context is injected and preview mode does NOT write to DB
  let capturedParams: DecomposeGeneratorParams | null = null;
  setAiDecomposeGeneratorForTest(async (params) => {
    capturedParams = params;
    return JSON.stringify({
      strategySummary:
        "Implement role modeling first, then secure Express routes and verify access boundaries.",
      subtasks: [
        {
          title: "Define user roles schema",
          description: "Add role enum and migration in Drizzle schema.",
          estimatedPomodoros: 2,
          priority: "high",
          suggestedCategoryId: category.id,
          suggestedDueDate: "2026-11-23",
        },
        {
          title: "Build RBAC authorization middleware",
          description: "Enforce role checks across protected Express routes.",
          estimatedPomodoros: 3,
          priority: "high",
          suggestedCategoryId: "00000000-0000-4000-8000-000000000000", // unknown -> sanitized to null
          suggestedDueDate: "2026-11-25",
        },
        {
          title: "Add RBAC endpoint integration tests",
          description: "Verify 403 responses for restricted actions.",
          estimatedPomodoros: 2,
          priority: "medium",
          suggestedCategoryId: category.id,
          suggestedDueDate: "2026-11-27",
        },
      ],
    });
  });

  const previewRes = await apiRequest("/api/ai/decompose-task", {
    method: "POST",
    token,
    body: {
      goal: "Build authentication and role-based access control",
      targetDate: "2026-11-28",
      autoCreate: false,
    },
  });
  assert.equal(previewRes.status, 200);
  const previewData = previewRes.body.data as {
    strategySummary: string;
    subtasks: Array<{
      title: string;
      estimatedPomodoros: number;
      priority: string;
      suggestedCategoryId: string | null;
      suggestedDueDate: string;
    }>;
    workspaceContext: {
      pendingTaskCount: number;
      categoriesCount: number;
      tagsCount: number;
    };
    createdTasks?: unknown[];
  };

  assert.ok(capturedParams);
  assert.equal(capturedParams!.model, "gemini-4-hydrogen");
  assert.equal(capturedParams!.workspaceContext.pendingTaskCount, 2);
  assert.equal(capturedParams!.workspaceContext.categories.length, 1);
  assert.equal(capturedParams!.workspaceContext.tags.length, 1);
  assert.equal(previewData.subtasks.length, 3);
  assert.equal(previewData.subtasks[0]!.suggestedCategoryId, category.id);
  assert.equal(previewData.subtasks[1]!.suggestedCategoryId, null);
  assert.equal(previewData.createdTasks, undefined);

  // Confirm DB still has only the 2 seeded pending tasks
  const listBefore = await apiRequest("/api/tasks", { token });
  assert.equal((listBefore.body.data as unknown[]).length, 2);

  // 5. autoCreate: true inserts all subtasks atomically in PostgreSQL
  const autoRes = await apiRequest("/api/ai/decompose-task", {
    method: "POST",
    token,
    body: {
      goal: "Build authentication and role-based access control",
      targetDate: "2026-11-28",
      autoCreate: true,
    },
  });
  assert.equal(autoRes.status, 201);
  const autoData = autoRes.body.data as {
    createdTasks: Array<{
      id: string;
      title: string;
      estimatedMinutes: number;
      priority: string;
      categoryId: string | null;
    }>;
  };
  assert.equal(autoData.createdTasks.length, 3);
  assert.equal(autoData.createdTasks[0]!.estimatedMinutes, 50);
  assert.equal(autoData.createdTasks[1]!.estimatedMinutes, 75);
  assert.equal(autoData.createdTasks[0]!.priority, "HIGH");
  assert.equal(autoData.createdTasks[0]!.categoryId, category.id);
  assert.equal(autoData.createdTasks[1]!.categoryId, null);

  const listAfterAuto = await apiRequest("/api/tasks", { token });
  assert.equal((listAfterAuto.body.data as unknown[]).length, 5);

  // 6. Companion POST /api/tasks/bulk creates tasks atomically
  const bulkRes = await apiRequest("/api/tasks/bulk", {
    method: "POST",
    token,
    body: {
      tasks: [
        {
          title: "Bulk subtask A",
          description: "First atomic bulk item",
          priority: "high",
          categoryId: category.id,
          dueDate: "2026-11-29",
          estimatedMinutes: 25,
        },
        {
          title: "Bulk subtask B",
          description: "Second atomic bulk item",
          priority: "low",
          categoryId: null,
          dueDate: "2026-11-30",
          estimatedMinutes: 50,
        },
      ],
    },
  });
  assert.equal(bulkRes.status, 201);
  assert.equal((bulkRes.body.data as unknown[]).length, 2);

  const listAfterBulk = await apiRequest("/api/tasks", { token });
  assert.equal((listAfterBulk.body.data as unknown[]).length, 7);

  // 7. Atomicity check: invalid category in 2nd task aborts entire batch (0 partial writes)
  const failedBulk = await apiRequest("/api/tasks/bulk", {
    method: "POST",
    token,
    body: {
      tasks: [
        {
          title: "Should NOT be persisted",
          priority: "medium",
          categoryId: category.id,
        },
        {
          title: "Invalid category reference",
          priority: "low",
          categoryId: "11111111-1111-4111-8111-111111111111",
        },
      ],
    },
  });
  assert.equal(failedBulk.status, 400);

  const listAfterFailedBulk = await apiRequest("/api/tasks", { token });
  assert.equal((listAfterFailedBulk.body.data as unknown[]).length, 7);

  // 8. Upstream 429 rate limit surfaces as structured HTTP 429
  setAiDecomposeGeneratorForTest(async () => {
    const err = new Error("429 RESOURCE_EXHAUSTED: Quota exceeded");
    (err as { status?: number }).status = 429;
    throw err;
  });
  const rateLimitRes = await apiRequest("/api/ai/decompose-task", {
    method: "POST",
    token,
    body: { goal: "Ship billing analytics dashboard" },
  });
  assert.equal(rateLimitRes.status, 429);
  assert.equal(rateLimitRes.body.code, "AI_RATE_LIMITED");

  // 9. Missing GEMINI_API_KEY surfaces as structured HTTP 503
  setAiDecomposeGeneratorForTest(null);
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const missingKeyRes = await apiRequest("/api/ai/decompose-task", {
      method: "POST",
      token,
      body: { goal: "Ship billing analytics dashboard" },
    });
    assert.equal(missingKeyRes.status, 503);
    assert.equal(missingKeyRes.body.code, "AI_SERVICE_UNAVAILABLE");
  } finally {
    if (originalKey !== undefined) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  }
});
