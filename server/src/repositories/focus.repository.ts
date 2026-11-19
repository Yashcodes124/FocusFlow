import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import { focusSessions, tasks } from "../../../src/db/schema.js";

export type FocusSessionRow = typeof focusSessions.$inferSelect;

export interface HydratedFocusSession extends FocusSessionRow {
  taskTitle: string | null;
}

export const createFocusSession = async (data: {
  userId: string;
  taskId?: string | null;
  sessionType: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";
  plannedMinutes: number;
  notes?: string | null;
}): Promise<FocusSessionRow> => {
  const rows = await db
    .insert(focusSessions)
    .values({
      userId: data.userId,
      taskId: data.taskId ?? null,
      sessionType: data.sessionType,
      status: "IN_PROGRESS",
      plannedMinutes: data.plannedMinutes,
      actualSeconds: 0,
      startedAt: new Date(),
      notes: data.notes ?? null,
    })
    .returning();
  return rows[0]!;
};

export const findFocusSessionByIdAndUser = async (
  id: string,
  userId: string,
): Promise<FocusSessionRow | null> => {
  const rows = await db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.id, id), eq(focusSessions.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
};

export const completeFocusSessionByIdAndUser = async (
  id: string,
  userId: string,
  data: {
    actualSeconds: number;
    status: "COMPLETED" | "CANCELLED";
    notes?: string | null;
  },
): Promise<FocusSessionRow | null> => {
  const rows = await db
    .update(focusSessions)
    .set({
      actualSeconds: data.actualSeconds,
      status: data.status,
      endedAt: new Date(),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(focusSessions.id, id), eq(focusSessions.userId, userId)))
    .returning();
  return rows[0] ?? null;
};

export const listFocusSessionsByUser = async (
  userId: string,
  limit = 30,
): Promise<HydratedFocusSession[]> => {
  const rows = await db
    .select({
      session: focusSessions,
      taskTitle: tasks.title,
    })
    .from(focusSessions)
    .leftJoin(tasks, eq(focusSessions.taskId, tasks.id))
    .where(eq(focusSessions.userId, userId))
    .orderBy(desc(focusSessions.startedAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r.session,
    taskTitle: r.taskTitle ?? null,
  }));
};

export const listCompletedFocusSessionsSince = async (
  userId: string,
  since: Date,
): Promise<FocusSessionRow[]> => {
  return db
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        eq(focusSessions.status, "COMPLETED"),
        gte(focusSessions.startedAt, since),
      ),
    )
    .orderBy(desc(focusSessions.startedAt));
};
