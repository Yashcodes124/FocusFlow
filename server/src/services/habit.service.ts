import { Errors } from "../lib/errors.js";
import {
  addHabitCompletion,
  createHabit,
  deleteHabitByIdAndUser,
  findCompletion,
  findHabitByIdAndUser,
  listCompletionsForHabits,
  listHabitsByUser,
  persistHabitStreakSnapshot,
  removeHabitCompletion,
  updateHabitByIdAndUser,
  type HabitRow,
} from "../repositories/habit.repository.js";
import {
  calculateHabitStreaks,
  formatLocalDate,
  isValidDateKey,
} from "../utils/streak.js";
import type {
  CheckInHabitInput,
  CreateHabitInput,
  UpdateHabitInput,
} from "../validators/habit.validator.js";

export interface HydratedHabit extends HabitRow {
  completedToday: boolean;
  weeklyCompletedCount: number;
  recent7Days: Array<{ date: string; completed: boolean }>;
  completionDates: string[];
}

function hydrateHabitWithCompletions(
  habit: HabitRow,
  completionDates: string[],
  todayKey: string,
): HydratedHabit {
  const stats = calculateHabitStreaks(completionDates, todayKey);
  return {
    ...habit,
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    lastCompletedDate: stats.lastCompletedDate,
    completedToday: stats.completedToday,
    weeklyCompletedCount: stats.weeklyCompletedCount,
    recent7Days: stats.recent7Days,
    completionDates: Array.from(new Set(completionDates)).sort().reverse(),
  };
}

export const listHabitsService = async (
  userId: string,
  timeZone = "UTC",
): Promise<HydratedHabit[]> => {
  const todayKey = formatLocalDate(new Date(), timeZone);
  const habitRows = await listHabitsByUser(userId);
  if (habitRows.length === 0) return [];

  const completions = await listCompletionsForHabits(
    habitRows.map((h) => h.id),
    userId,
  );

  const byHabit = new Map<string, string[]>();
  for (const c of completions) {
    const arr = byHabit.get(c.habitId) ?? [];
    arr.push(c.completedDate);
    byHabit.set(c.habitId, arr);
  }

  return habitRows.map((habit) =>
    hydrateHabitWithCompletions(habit, byHabit.get(habit.id) ?? [], todayKey),
  );
};

export const createHabitService = async (
  userId: string,
  data: CreateHabitInput,
  timeZone = "UTC",
): Promise<HydratedHabit> => {
  const created = await createHabit({
    userId,
    name: data.name,
    description: data.description ?? null,
    frequency: data.frequency ?? "DAILY",
    target: data.target ?? 1,
    color: data.color ?? "#2563EB",
  });
  const todayKey = formatLocalDate(new Date(), timeZone);
  return hydrateHabitWithCompletions(created, [], todayKey);
};

export const updateHabitService = async (
  habitId: string,
  userId: string,
  data: UpdateHabitInput,
  timeZone = "UTC",
): Promise<HydratedHabit> => {
  const updated = await updateHabitByIdAndUser(habitId, userId, {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined
      ? { description: data.description }
      : {}),
    ...(data.frequency !== undefined ? { frequency: data.frequency } : {}),
    ...(data.target !== undefined ? { target: data.target } : {}),
    ...(data.color !== undefined ? { color: data.color } : {}),
  });

  if (!updated) {
    throw Errors.notFound("Habit not found");
  }

  const completions = await listCompletionsForHabits([habitId], userId);
  const todayKey = formatLocalDate(new Date(), timeZone);
  return hydrateHabitWithCompletions(
    updated,
    completions.map((c) => c.completedDate),
    todayKey,
  );
};

export const deleteHabitService = async (
  habitId: string,
  userId: string,
): Promise<void> => {
  const deleted = await deleteHabitByIdAndUser(habitId, userId);
  if (!deleted) {
    throw Errors.notFound("Habit not found");
  }
};

export const checkInHabitService = async (
  habitId: string,
  userId: string,
  input: CheckInHabitInput,
): Promise<HydratedHabit> => {
  const habit = await findHabitByIdAndUser(habitId, userId);
  if (!habit) {
    throw Errors.notFound("Habit not found");
  }

  const timeZone = input.timezone || "UTC";
  const todayKey = formatLocalDate(new Date(), timeZone);
  const targetDateKey = input.date || todayKey;

  if (!isValidDateKey(targetDateKey)) {
    throw Errors.badRequest("Invalid check-in date");
  }
  if (targetDateKey > todayKey) {
    throw Errors.badRequest("Cannot check in for a future date");
  }

  const existingCompletion = await findCompletion(
    habitId,
    userId,
    targetDateKey,
  );
  const shouldBeCompleted =
    input.completed !== undefined ? input.completed : !existingCompletion;

  if (shouldBeCompleted && !existingCompletion) {
    await addHabitCompletion(habitId, userId, targetDateKey);
  } else if (!shouldBeCompleted && existingCompletion) {
    await removeHabitCompletion(habitId, userId, targetDateKey);
  }

  const completions = await listCompletionsForHabits([habitId], userId);
  const dates = completions.map((c) => c.completedDate);
  const stats = calculateHabitStreaks(dates, todayKey);

  const persisted =
    (await persistHabitStreakSnapshot(habitId, userId, {
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      lastCompletedDate: stats.lastCompletedDate,
    })) ?? habit;

  return hydrateHabitWithCompletions(persisted, dates, todayKey);
};
