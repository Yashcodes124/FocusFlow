import { apiClient } from "../../../lib/api";
import { getBrowserTimezone } from "../../../utils/dates";
import type { Habit } from "../../habits/types";
import type { Task } from "../../tasks/types";

export interface DashboardSummary {
  dateKey: string;
  overview: {
    openTasksCount: number;
    completedTodayCount: number;
    completedTasksTotal: number;
    overdueCount: number;
    dueTodayCount: number;
    habitsCompletedToday: number;
    habitsTotal: number;
    todayFocusMinutes: number;
    todayFocusSessions: number;
    weeklyFocusMinutes: number;
  };
  todayTasks: Task[];
  overdueTasks: Task[];
  upcomingTasks: Task[];
  unscheduledOpenTasks: Task[];
  habits: Habit[];
  focusDailyHistory: Array<{
    date: string;
    focusMinutes: number;
    sessions: number;
  }>;
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const res = await apiClient.get<{ success: true; data: DashboardSummary }>(
      "/dashboard",
      { params: { timezone: getBrowserTimezone() } },
    );
    return res.data.data;
  },
};
