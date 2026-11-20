import { listTasksByUser } from "../repositories/task.repository.js";
import { listHabitsService } from "./habit.service.js";
import { getFocusOverviewService } from "./focus.service.js";
import { formatLocalDate } from "../utils/streak.js";

export const getDashboardSummaryService = async (
  userId: string,
  timeZone = "UTC",
) => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setUTCHours(23, 59, 59, 999);
  const todayKey = formatLocalDate(now, timeZone);

  const [allTasksResult, habits, focusOverview] = await Promise.all([
    listTasksByUser({
      userId,
      sortBy: "dueDate",
      sortOrder: "asc",
      page: 1,
      limit: 100,
      startOfToday,
      endOfToday,
    }),
    listHabitsService(userId, timeZone),
    getFocusOverviewService(userId, timeZone),
  ]);

  const allTasks = allTasksResult.items;

  const overdueTasks = allTasks.filter(
    (t) =>
      t.status !== "COMPLETED" &&
      t.dueDate !== null &&
      new Date(t.dueDate) < startOfToday,
  );

  const todayTasks = allTasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueKey = formatLocalDate(new Date(t.dueDate), timeZone);
    return dueKey === todayKey;
  });

  const upcomingTasks = allTasks
    .filter(
      (t) =>
        t.status !== "COMPLETED" &&
        t.dueDate !== null &&
        new Date(t.dueDate) > endOfToday,
    )
    .slice(0, 8);

  const unscheduledOpenTasks = allTasks
    .filter((t) => t.status !== "COMPLETED" && t.dueDate === null)
    .slice(0, 6);

  const completedTodayCount = allTasks.filter(
    (t) =>
      t.status === "COMPLETED" &&
      t.completedAt !== null &&
      formatLocalDate(new Date(t.completedAt), timeZone) === todayKey,
  ).length;

  const openTasksCount = allTasks.filter((t) => t.status !== "COMPLETED").length;
  const completedTasksTotal = allTasks.filter(
    (t) => t.status === "COMPLETED",
  ).length;

  const completedHabitsToday = habits.filter((h) => h.completedToday).length;
  const totalHabits = habits.length;

  return {
    dateKey: todayKey,
    overview: {
      openTasksCount,
      completedTodayCount,
      completedTasksTotal,
      overdueCount: overdueTasks.length,
      dueTodayCount: todayTasks.filter((t) => t.status !== "COMPLETED").length,
      habitsCompletedToday: completedHabitsToday,
      habitsTotal: totalHabits,
      todayFocusMinutes: focusOverview.todayFocusMinutes,
      todayFocusSessions: focusOverview.todayCompletedSessions,
      weeklyFocusMinutes: focusOverview.weeklyFocusMinutes,
    },
    todayTasks,
    overdueTasks,
    upcomingTasks,
    unscheduledOpenTasks,
    habits,
    focusDailyHistory: focusOverview.dailyHistory,
  };
};
