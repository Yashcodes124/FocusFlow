import { apiClient } from "../../../lib/api";
import { getBrowserTimezone } from "../../../utils/dates";
import type { FocusMode } from "../../../utils/focusTimer";

export interface FocusSessionRecord {
  id: string;
  userId: string;
  taskId: string | null;
  taskTitle: string | null;
  sessionType: FocusMode;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  plannedMinutes: number;
  actualSeconds: number;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
}

export interface FocusOverview {
  todayFocusMinutes: number;
  todayFocusSeconds: number;
  todayCompletedSessions: number;
  weeklyFocusMinutes: number;
  dailyHistory: Array<{ date: string; focusMinutes: number; sessions: number }>;
  recentSessions: FocusSessionRecord[];
}

export const focusService = {
  async getOverview(): Promise<FocusOverview> {
    const res = await apiClient.get<{ success: true; data: FocusOverview }>(
      "/focus/overview",
      { params: { timezone: getBrowserTimezone() } },
    );
    return res.data.data;
  },

  async startSession(payload: {
    taskId?: string | null;
    sessionType: FocusMode;
    plannedMinutes: number;
    notes?: string | null;
  }): Promise<FocusSessionRecord> {
    const res = await apiClient.post<{
      success: true;
      data: FocusSessionRecord;
    }>("/focus/sessions", payload);
    return res.data.data;
  },

  async completeSession(
    id: string,
    payload: {
      actualSeconds: number;
      status: "COMPLETED" | "CANCELLED";
      notes?: string | null;
    },
  ): Promise<FocusSessionRecord> {
    const res = await apiClient.patch<{
      success: true;
      data: FocusSessionRecord;
    }>(`/focus/sessions/${id}/complete`, payload);
    return res.data.data;
  },
};
