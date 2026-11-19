import { apiClient } from "../../../lib/api";
import { getBrowserTimezone } from "../../../utils/dates";
import type {
  CreateHabitPayload,
  Habit,
  UpdateHabitPayload,
} from "../types";

export const habitService = {
  async list(): Promise<Habit[]> {
    const timezone = getBrowserTimezone();
    const res = await apiClient.get<{ success: true; data: Habit[] }>(
      "/habits",
      { params: { timezone } },
    );
    return res.data.data;
  },

  async create(payload: CreateHabitPayload): Promise<Habit> {
    const timezone = getBrowserTimezone();
    const res = await apiClient.post<{ success: true; data: Habit }>(
      "/habits",
      payload,
      { params: { timezone } },
    );
    return res.data.data;
  },

  async update(id: string, payload: UpdateHabitPayload): Promise<Habit> {
    const timezone = getBrowserTimezone();
    const res = await apiClient.patch<{ success: true; data: Habit }>(
      `/habits/${id}`,
      payload,
      { params: { timezone } },
    );
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/habits/${id}`);
  },

  async checkIn(
    id: string,
    options?: { date?: string; completed?: boolean },
  ): Promise<Habit> {
    const timezone = getBrowserTimezone();
    const res = await apiClient.post<{ success: true; data: Habit }>(
      `/habits/${id}/check-in`,
      {
        timezone,
        ...(options?.date ? { date: options.date } : {}),
        ...(options?.completed !== undefined
          ? { completed: options.completed }
          : {}),
      },
    );
    return res.data.data;
  },
};
