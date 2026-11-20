export type HabitFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  target: number;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  completedToday: boolean;
  weeklyCompletedCount: number;
  recent7Days: Array<{ date: string; completed: boolean }>;
  completionDates: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHabitPayload {
  name: string;
  description?: string | null;
  frequency: HabitFrequency;
  target: number;
  color: string;
}

export type UpdateHabitPayload = Partial<CreateHabitPayload>;
