import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import { habitCompletions, habits } from "../../../src/db/schema.js";

export type HabitRow = typeof habits.$inferSelect;
export type HabitCompletionRow = typeof habitCompletions.$inferSelect;

export interface CreateHabitRepoData {
  userId: string;
  name: string;
  description?: string | null;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  target: number;
  color: string;
}

export interface UpdateHabitRepoData {
  name?: string;
  description?: string | null;
  frequency?: "DAILY" | "WEEKLY" | "MONTHLY";
  target?: number;
  color?: string;
}

export const listHabitsByUser = async (userId: string): Promise<HabitRow[]> => {
  return db
    .select()
    .from(habits)
    .where(eq(habits.userId, userId))
    .orderBy(asc(habits.createdAt));
};

export const findHabitByIdAndUser = async (
  id: string,
  userId: string,
): Promise<HabitRow | null> => {
  const rows = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
};

export const createHabit = async (
  data: CreateHabitRepoData,
): Promise<HabitRow> => {
  const rows = await db.insert(habits).values(data).returning();
  return rows[0]!;
};

export const updateHabitByIdAndUser = async (
  id: string,
  userId: string,
  data: UpdateHabitRepoData,
): Promise<HabitRow | null> => {
  const rows = await db
    .update(habits)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .returning();
  return rows[0] ?? null;
};

export const deleteHabitByIdAndUser = async (
  id: string,
  userId: string,
): Promise<boolean> => {
  const rows = await db
    .delete(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .returning({ id: habits.id });
  return rows.length > 0;
};

export const listCompletionsForHabits = async (
  habitIds: string[],
  userId: string,
): Promise<HabitCompletionRow[]> => {
  if (habitIds.length === 0) return [];
  return db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.userId, userId),
        inArray(habitCompletions.habitId, habitIds),
      ),
    )
    .orderBy(desc(habitCompletions.completedDate));
};

export const findCompletion = async (
  habitId: string,
  userId: string,
  completedDate: string,
): Promise<HabitCompletionRow | null> => {
  const rows = await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        eq(habitCompletions.userId, userId),
        eq(habitCompletions.completedDate, completedDate),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
};

export const addHabitCompletion = async (
  habitId: string,
  userId: string,
  completedDate: string,
): Promise<void> => {
  await db
    .insert(habitCompletions)
    .values({ habitId, userId, completedDate })
    .onConflictDoNothing();
};

export const removeHabitCompletion = async (
  habitId: string,
  userId: string,
  completedDate: string,
): Promise<void> => {
  await db
    .delete(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        eq(habitCompletions.userId, userId),
        eq(habitCompletions.completedDate, completedDate),
      ),
    );
};

export const persistHabitStreakSnapshot = async (
  habitId: string,
  userId: string,
  snapshot: {
    currentStreak: number;
    bestStreak: number;
    lastCompletedDate: string | null;
  },
): Promise<HabitRow | null> => {
  const rows = await db
    .update(habits)
    .set({
      currentStreak: snapshot.currentStreak,
      bestStreak: snapshot.bestStreak,
      lastCompletedDate: snapshot.lastCompletedDate,
      updatedAt: new Date(),
    })
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .returning();
  return rows[0] ?? null;
};
