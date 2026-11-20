process.env.NODE_ENV = "test";

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import app from "../app.js";
import { deleteUserById } from "../repositories/user.repository.js";
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

test("Full FocusFlow API integration: auth, tasks, isolation, habits, focus sessions, and notes", async () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const emailA = `alice-${suffix}@example.com`;
  const emailB = `bob-${suffix}@example.com`;
  const password = "StrongPassword123";

  // 1. Protected routes reject unauthenticated access
  const unauthRes = await apiRequest("/api/tasks");
  assert.equal(unauthRes.status, 401);
  assert.equal(unauthRes.body.success, false);

  // 2. Register User A
  const regA = await apiRequest("/api/users/register", {
    method: "POST",
    body: { name: "Alice Chen", email: emailA, password },
  });
  assert.equal(regA.status, 201);
  assert.equal(regA.body.success, true);
  const userA = regA.body.user as { id: string; email: string };
  const tokenA1 = regA.body.token as string;
  assert.ok(userA.id);
  assert.ok(tokenA1);
  createdUserIds.push(userA.id);

  // 3. Duplicate registration returns 409
  const dupReg = await apiRequest("/api/users/register", {
    method: "POST",
    body: { name: "Alice Clone", email: emailA, password },
  });
  assert.equal(dupReg.status, 409);

  // 4. Invalid credentials return 401
  const badLogin = await apiRequest("/api/users/login", {
    method: "POST",
    body: { email: emailA, password: "WrongPassword999" },
  });
  assert.equal(badLogin.status, 401);

  // 5. Logout invalidates tokenA1 server-side via tokenVersion
  const logoutRes = await apiRequest("/api/users/logout", {
    method: "POST",
    token: tokenA1,
  });
  assert.equal(logoutRes.status, 200);

  const staleMe = await apiRequest("/api/users/me", { token: tokenA1 });
  assert.equal(staleMe.status, 401);

  // 6. Fresh login succeeds and /me returns profile
  const loginA = await apiRequest("/api/users/login", {
    method: "POST",
    body: { email: emailA, password },
  });
  assert.equal(loginA.status, 200);
  const tokenA = loginA.body.token as string;

  const meRes = await apiRequest("/api/users/me", { token: tokenA });
  assert.equal(meRes.status, 200);
  assert.equal((meRes.body.data as { email: string }).email, emailA);

  // 7. Register User B to test cross-user isolation
  const regB = await apiRequest("/api/users/register", {
    method: "POST",
    body: { name: "Bob Patel", email: emailB, password },
  });
  assert.equal(regB.status, 201);
  const userB = regB.body.user as { id: string };
  const tokenB = regB.body.token as string;
  createdUserIds.push(userB.id);

  // 8. Categories & Tags CRUD for User A
  const catRes = await apiRequest("/api/categories", {
    method: "POST",
    token: tokenA,
    body: { name: "Deep Work", color: "#2563EB" },
  });
  assert.equal(catRes.status, 201);
  const categoryId = (catRes.body.data as { id: string }).id;

  const tagRes = await apiRequest("/api/tags", {
    method: "POST",
    token: tokenA,
    body: { name: "Release", color: "#0D9488" },
  });
  assert.equal(tagRes.status, 201);
  const tagId = (tagRes.body.data as { id: string }).id;

  // 9. Task CRUD with category & many-to-many tags
  const createTaskRes = await apiRequest("/api/tasks", {
    method: "POST",
    token: tokenA,
    body: {
      title: "Ship Phase 1 Backend",
      description: "Verify Drizzle relations and ownership",
      priority: "HIGH",
      status: "TODO",
      categoryId,
      tagIds: [tagId],
      dueDate: new Date().toISOString().slice(0, 10),
    },
  });
  assert.equal(createTaskRes.status, 201);
  const taskA = createTaskRes.body.data as {
    id: string;
    title: string;
    category: { id: string } | null;
    tags: Array<{ id: string }>;
  };
  assert.equal(taskA.category?.id, categoryId);
  assert.equal(taskA.tags.length, 1);
  assert.equal(taskA.tags[0]?.id, tagId);

  // Search & Filter Tasks (title, description, multi-word, case-insensitive, wildcard-safe)
  const listRes = await apiRequest("/api/tasks?priority=HIGH&search=Phase", {
    token: tokenA,
  });
  assert.equal(listRes.status, 200);
  const listedTasks = listRes.body.data as Array<{ id: string }>;
  assert.equal(listedTasks.length, 1);
  assert.equal(listedTasks[0]?.id, taskA.id);

  const descSearchRes = await apiRequest("/api/tasks?search=DRIZZLE", {
    token: tokenA,
  });
  assert.equal(descSearchRes.status, 200);
  assert.equal((descSearchRes.body.data as Array<{ id: string }>).length, 1);

  const multiWordRes = await apiRequest("/api/tasks?search=Phase%20ownership", {
    token: tokenA,
  });
  assert.equal(multiWordRes.status, 200);
  assert.equal((multiWordRes.body.data as Array<{ id: string }>).length, 1);

  const wildcardRes = await apiRequest("/api/tasks?search=%25", {
    token: tokenA,
  });
  assert.equal(wildcardRes.status, 200);
  assert.equal((wildcardRes.body.data as Array<{ id: string }>).length, 0);

  // Cross-user isolation: User B cannot read, update, or delete User A's task
  const crossGet = await apiRequest(`/api/tasks/${taskA.id}`, { token: tokenB });
  assert.equal(crossGet.status, 404);
  const crossPatch = await apiRequest(`/api/tasks/${taskA.id}`, {
    method: "PATCH",
    token: tokenB,
    body: { title: "Hijacked" },
  });
  assert.equal(crossPatch.status, 404);
  const crossDelete = await apiRequest(`/api/tasks/${taskA.id}`, {
    method: "DELETE",
    token: tokenB,
  });
  assert.equal(crossDelete.status, 404);

  // Toggle task completion
  const toggleRes = await apiRequest(`/api/tasks/${taskA.id}/toggle`, {
    method: "PATCH",
    token: tokenA,
  });
  assert.equal(toggleRes.status, 200);
  assert.equal((toggleRes.body.data as { status: string }).status, "COMPLETED");

  // 10. Habit creation, check-in, duplicate idempotency, and uncheck
  const createHabitRes = await apiRequest("/api/habits", {
    method: "POST",
    token: tokenA,
    body: { name: "Morning Planning", frequency: "DAILY", target: 1 },
  });
  assert.equal(createHabitRes.status, 201);
  const habitId = (createHabitRes.body.data as { id: string }).id;

  const checkIn1 = await apiRequest(`/api/habits/${habitId}/check-in`, {
    method: "POST",
    token: tokenA,
    body: { completed: true, timezone: "UTC" },
  });
  assert.equal(checkIn1.status, 200);
  const habitAfterCheckIn = checkIn1.body.data as {
    completedToday: boolean;
    currentStreak: number;
    bestStreak: number;
  };
  assert.equal(habitAfterCheckIn.completedToday, true);
  assert.equal(habitAfterCheckIn.currentStreak, 1);
  assert.equal(habitAfterCheckIn.bestStreak, 1);

  // Duplicate check-in with completed: true stays streak 1 (idempotent)
  const checkInDup = await apiRequest(`/api/habits/${habitId}/check-in`, {
    method: "POST",
    token: tokenA,
    body: { completed: true, timezone: "UTC" },
  });
  assert.equal(checkInDup.status, 200);
  assert.equal(
    (checkInDup.body.data as { currentStreak: number }).currentStreak,
    1,
  );

  // Cross-user habit check-in rejected
  const crossHabit = await apiRequest(`/api/habits/${habitId}/check-in`, {
    method: "POST",
    token: tokenB,
    body: { completed: true },
  });
  assert.equal(crossHabit.status, 404);

  // 11. Focus session persistence & stats
  const startFocus = await apiRequest("/api/focus/sessions", {
    method: "POST",
    token: tokenA,
    body: { taskId: taskA.id, sessionType: "FOCUS", plannedMinutes: 25 },
  });
  assert.equal(startFocus.status, 201);
  const sessionId = (startFocus.body.data as { id: string }).id;

  const completeFocus = await apiRequest(
    `/api/focus/sessions/${sessionId}/complete`,
    {
      method: "PATCH",
      token: tokenA,
      body: { actualSeconds: 1500, status: "COMPLETED" },
    },
  );
  assert.equal(completeFocus.status, 200);

  const focusOverview = await apiRequest("/api/focus/overview?timezone=UTC", {
    token: tokenA,
  });
  assert.equal(focusOverview.status, 200);
  assert.equal(
    (focusOverview.body.data as { todayFocusMinutes: number })
      .todayFocusMinutes,
    25,
  );

  // 12. Notes CRUD & deterministic task extraction
  const createNoteRes = await apiRequest("/api/notes", {
    method: "POST",
    token: tokenA,
    body: {
      title: "Architecture Review",
      content: "- [ ] Add rate limiting\nTODO: Document deployment steps",
      categoryId,
    },
  });
  assert.equal(createNoteRes.status, 201);
  const noteId = (createNoteRes.body.data as { id: string }).id;

  const extractRes = await apiRequest(`/api/notes/${noteId}/extract-tasks`, {
    method: "POST",
    token: tokenA,
    body: {},
  });
  assert.equal(extractRes.status, 201);
  assert.equal(
    (extractRes.body.data as { extractedCount: number }).extractedCount,
    2,
  );

  // 13. Dashboard reflects real user data
  const dashRes = await apiRequest("/api/dashboard?timezone=UTC", {
    token: tokenA,
  });
  assert.equal(dashRes.status, 200);
  const overview = (dashRes.body.data as { overview: Record<string, number> })
    .overview;
  assert.equal(overview.todayFocusMinutes, 25);
  assert.equal(overview.habitsCompletedToday, 1);
  assert.equal(overview.completedTodayCount, 1);

  // Delete task works cleanly
  const deleteTaskRes = await apiRequest(`/api/tasks/${taskA.id}`, {
    method: "DELETE",
    token: tokenA,
  });
  assert.equal(deleteTaskRes.status, 200);
});
