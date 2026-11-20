import { Errors } from "../lib/errors.js";
import {
  completeFocusSessionByIdAndUser,
  createFocusSession,
  findFocusSessionByIdAndUser,
  listCompletedFocusSessionsSince,
  listFocusSessionsByUser,
} from "../repositories/focus.repository.js";
import { findTaskByIdAndUser } from "../repositories/task.repository.js";
import { addDaysToDateKey, formatLocalDate } from "../utils/streak.js";
import type {
  CompleteFocusSessionInput,
  StartFocusSessionInput,
} from "../validators/focus.validator.js";

export const startFocusSessionService = async (
  userId: string,
  input: StartFocusSessionInput,
) => {
  if (input.taskId) {
    const task = await findTaskByIdAndUser(input.taskId, userId);
    if (!task) {
      throw Errors.badRequest("Selected task was not found");
    }
  }

  return createFocusSession({
    userId,
    taskId: input.taskId ?? null,
    sessionType: input.sessionType ?? "FOCUS",
    plannedMinutes: input.plannedMinutes ?? 25,
    notes: input.notes ?? null,
  });
};

export const completeFocusSessionService = async (
  sessionId: string,
  userId: string,
  input: CompleteFocusSessionInput,
) => {
  const existing = await findFocusSessionByIdAndUser(sessionId, userId);
  if (!existing) {
    throw Errors.notFound("Focus session not found");
  }

  const updated = await completeFocusSessionByIdAndUser(sessionId, userId, {
    actualSeconds: input.actualSeconds,
    status: input.status ?? "COMPLETED",
    notes: input.notes,
  });

  if (!updated) {
    throw Errors.notFound("Focus session not found");
  }
  return updated;
};

export const getFocusOverviewService = async (
  userId: string,
  timeZone = "UTC",
) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayKey = formatLocalDate(now, timeZone);

  const [recentSessions, completedLast7Days] = await Promise.all([
    listFocusSessionsByUser(userId, 25),
    listCompletedFocusSessionsSince(userId, sevenDaysAgo),
  ]);

  const dailyBuckets = new Map<string, { focusSeconds: number; sessions: number }>();
  for (let offset = -6; offset <= 0; offset++) {
    dailyBuckets.set(addDaysToDateKey(todayKey, offset), {
      focusSeconds: 0,
      sessions: 0,
    });
  }

  let todayFocusSeconds = 0;
  let todayCompletedSessions = 0;
  let weeklyFocusSeconds = 0;

  for (const session of completedLast7Days) {
    if (session.sessionType !== "FOCUS") continue;
    const key = formatLocalDate(session.startedAt, timeZone);
    const bucket = dailyBuckets.get(key);
    if (bucket) {
      bucket.focusSeconds += session.actualSeconds;
      bucket.sessions += 1;
    }
    weeklyFocusSeconds += session.actualSeconds;
    if (key === todayKey) {
      todayFocusSeconds += session.actualSeconds;
      todayCompletedSessions += 1;
    }
  }

  const dailyHistory = Array.from(dailyBuckets.entries()).map(
    ([date, stats]) => ({
      date,
      focusMinutes: Math.round(stats.focusSeconds / 60),
      sessions: stats.sessions,
    }),
  );

  return {
    todayFocusMinutes: Math.round(todayFocusSeconds / 60),
    todayFocusSeconds,
    todayCompletedSessions,
    weeklyFocusMinutes: Math.round(weeklyFocusSeconds / 60),
    dailyHistory,
    recentSessions,
  };
};
