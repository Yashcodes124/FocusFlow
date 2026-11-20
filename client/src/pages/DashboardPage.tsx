import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Circle,
  Flame,
  Plus,
  Timer,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  dashboardService,
  type DashboardSummary,
} from "../features/dashboard/services/dashboardService";
import { taskService } from "../features/tasks/services/taskService";
import { habitService } from "../features/habits/services/habitService";
import type { Task, TaskPriority } from "../features/tasks/types";
import { extractApiErrorMessage } from "../lib/api";
import {
  formatFullDate,
  formatMinutesHuman,
  formatShortDate,
  getGreeting,
} from "../utils/dates";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorBanner, LoadingRows } from "../components/ui/States";

const PRIORITY_TEXT: Record<TaskPriority, { label: string; className: string }> =
  {
    HIGH: { label: "High", className: "text-red-600 dark:text-red-400 font-medium" },
    MEDIUM: {
      label: "Medium",
      className: "text-amber-600 dark:text-amber-400 font-medium",
    },
    LOW: { label: "Low", className: "text-slate-500 dark:text-slate-400" },
  };

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick capture state
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<TaskPriority>("MEDIUM");
  const [dueToday, setDueToday] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [busyHabitId, setBusyHabitId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      const data = await dashboardService.getSummary();
      setSummary(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to load dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    dashboardService
      .getSummary()
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(extractApiErrorMessage(err, "Failed to load dashboard."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) {
      setCaptureError("Enter a task title to capture.");
      return;
    }
    setCaptureError(null);
    setCapturing(true);
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      await taskService.create({
        title: trimmed,
        priority: quickPriority,
        status: "TODO",
        dueDate: dueToday ? todayIso : null,
      });
      setQuickTitle("");
      await loadDashboard();
    } catch (err) {
      setCaptureError(extractApiErrorMessage(err, "Failed to create task."));
    } finally {
      setCapturing(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    setBusyTaskId(task.id);
    try {
      await taskService.toggleComplete(task.id);
      await loadDashboard();
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not update task."));
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleToggleHabit = async (habitId: string, currentlyCompleted: boolean) => {
    setBusyHabitId(habitId);
    try {
      await habitService.checkIn(habitId, { completed: !currentlyCompleted });
      await loadDashboard();
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not update habit."));
    } finally {
      setBusyHabitId(null);
    }
  };

  const renderTaskRow = (task: Task, isOverdue = false) => {
    const completed = task.status === "COMPLETED";
    const priorityInfo = PRIORITY_TEXT[task.priority];
    return (
      <div
        key={task.id}
        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            disabled={busyTaskId === task.id}
            onClick={() => handleToggleTask(task)}
            aria-label={
              completed
                ? `Mark "${task.title}" incomplete`
                : `Mark "${task.title}" complete`
            }
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              completed
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-300 bg-white hover:border-blue-600 dark:border-slate-600 dark:bg-slate-900"
            }`}
          >
            {completed && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>

          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-sm font-medium ${
                completed
                  ? "text-slate-400 line-through dark:text-slate-500"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {task.title}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span className={priorityInfo.className}>{priorityInfo.label}</span>
              {task.category && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: task.category.color }}
                      aria-hidden="true"
                    />
                    {task.category.name}
                  </span>
                </>
              )}
              {task.dueDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      isOverdue
                        ? "font-medium text-red-600 dark:text-red-400"
                        : ""
                    }
                  >
                    {isOverdue ? "Overdue " : "Due "}
                    {formatShortDate(task.dueDate)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {!completed && (
          <button
            type="button"
            onClick={() => navigate(`/focus?taskId=${task.id}`)}
            aria-label={`Start focus session for "${task.title}"`}
            className="inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
          >
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Focus</span>
          </button>
        )}
      </div>
    );
  };

  const firstName = user?.name?.split(" ")[0] || "there";
  const overview = summary?.overview;
  const maxFocusMinutes = Math.max(
    25,
    ...(summary?.focusDailyHistory.map((d) => d.focusMinutes) ?? [0]),
  );

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatFullDate()}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            {getGreeting()}, {firstName}
          </h1>
        </div>

        <Button onClick={() => navigate("/focus")} size="md">
          <Timer className="h-4 w-4" aria-hidden="true" />
          Start focus session
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadDashboard} />}

      {/* Daily Productivity Summary Strip (real user metrics only) */}
      <section
        aria-label="Daily overview"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800"
      >
        <div className="bg-white p-4 sm:p-5 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Open tasks
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {overview ? overview.openTasksCount : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {overview
              ? overview.overdueCount > 0
                ? `${overview.overdueCount} overdue`
                : `${overview.dueTodayCount} due today`
              : "Loading…"}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Completed today
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {overview ? overview.completedTodayCount : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {overview ? `${overview.completedTasksTotal} total finished` : "Loading…"}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Habits today
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {overview
              ? `${overview.habitsCompletedToday}/${overview.habitsTotal}`
              : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {overview && overview.habitsTotal > 0
              ? `${Math.round((overview.habitsCompletedToday / overview.habitsTotal) * 100)}% completed`
              : "No habits tracked yet"}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Focus time today
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {overview ? formatMinutesHuman(overview.todayFocusMinutes) : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {overview
              ? `${overview.todayFocusSessions} session${overview.todayFocusSessions === 1 ? "" : "s"} · ${formatMinutesHuman(overview.weeklyFocusMinutes)} this week`
              : "Loading…"}
          </p>
        </div>
      </section>

      {/* Quick Task Capture */}
      <section aria-label="Quick capture">
        <form
          onSubmit={handleQuickCapture}
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
        >
          <label htmlFor="quick-task-input" className="sr-only">
            Quick capture a task
          </label>
          <input
            id="quick-task-input"
            type="text"
            value={quickTitle}
            onChange={(e) => {
              setQuickTitle(e.target.value);
              if (captureError) setCaptureError(null);
            }}
            placeholder="Capture a task for today…"
            className="min-h-[40px] flex-1 bg-transparent px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <label htmlFor="quick-priority" className="sr-only">
              Task priority
            </label>
            <select
              id="quick-priority"
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
              className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="HIGH">High priority</option>
              <option value="MEDIUM">Medium priority</option>
              <option value="LOW">Low priority</option>
            </select>

            <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={dueToday}
                onChange={(e) => setDueToday(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
              />
              <span>Due today</span>
            </label>

            <Button
              type="submit"
              size="sm"
              loading={capturing}
              className="w-full sm:w-auto"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add task
            </Button>
          </div>
        </form>
        {captureError && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
            {captureError}
          </p>
        )}
      </section>

      {/* Main Content Split */}
      {loading ? (
        <LoadingRows count={5} />
      ) : summary ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Tasks Column */}
          <div className="space-y-6 lg:col-span-7">
            {summary.overdueTasks.length > 0 && (
              <section aria-labelledby="overdue-heading" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2
                    id="overdue-heading"
                    className="text-base font-semibold text-red-600 dark:text-red-400"
                  >
                    Overdue ({summary.overdueTasks.length})
                  </h2>
                  <Link
                    to="/tasks?due=overdue"
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    View all
                  </Link>
                </div>
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                  {summary.overdueTasks.map((task) => renderTaskRow(task, true))}
                </div>
              </section>
            )}

            <section aria-labelledby="today-tasks-heading" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2
                  id="today-tasks-heading"
                  className="text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  Today&apos;s tasks
                </h2>
                <Link
                  to="/tasks"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  <span>All tasks</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>

              {summary.todayTasks.length > 0 ? (
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                  {summary.todayTasks.map((task) => renderTaskRow(task))}
                </div>
              ) : (
                <EmptyState
                  title="Nothing scheduled for today yet"
                  description="Use the quick capture bar above to add a task due today, or schedule items from your task list."
                  action={
                    <Link to="/tasks">
                      <Button variant="secondary" size="sm">
                        Open task list
                      </Button>
                    </Link>
                  }
                />
              )}
            </section>

            {(summary.upcomingTasks.length > 0 ||
              summary.unscheduledOpenTasks.length > 0) && (
              <section aria-labelledby="upcoming-heading" className="space-y-3">
                <h2
                  id="upcoming-heading"
                  className="text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  Upcoming &amp; backlog
                </h2>
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                  {[
                    ...summary.upcomingTasks,
                    ...summary.unscheduledOpenTasks,
                  ]
                    .slice(0, 6)
                    .map((task) => renderTaskRow(task))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Habits & 7-Day Focus History */}
          <div className="space-y-6 lg:col-span-5">
            <section aria-labelledby="habits-heading" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2
                  id="habits-heading"
                  className="text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  Daily habits
                </h2>
                <Link
                  to="/habits"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  <span>Manage</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>

              {summary.habits.length > 0 ? (
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                  {summary.habits.map((habit) => (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <button
                        type="button"
                        disabled={busyHabitId === habit.id}
                        onClick={() =>
                          handleToggleHabit(habit.id, habit.completedToday)
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                      >
                        {habit.completedToday ? (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        ) : (
                          <Circle
                            className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600"
                            aria-hidden="true"
                          />
                        )}
                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm font-medium ${
                              habit.completedToday
                                ? "text-slate-500 line-through dark:text-slate-400"
                                : "text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {habit.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {habit.weeklyCompletedCount}/7 days this week
                          </p>
                        </div>
                      </button>

                      <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
                        <Flame
                          className={`h-3.5 w-3.5 ${
                            habit.currentStreak > 0
                              ? "text-amber-500"
                              : "text-slate-300 dark:text-slate-600"
                          }`}
                          aria-hidden="true"
                        />
                        {habit.currentStreak}d
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No habits added yet"
                  description="Track repeating routines like morning planning, exercise, or reading to build consistent streaks."
                  action={
                    <Link to="/habits">
                      <Button variant="secondary" size="sm">
                        Create your first habit
                      </Button>
                    </Link>
                  }
                />
              )}
            </section>

            {/* Real 7-Day Focus History */}
            <section
              aria-labelledby="focus-week-heading"
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    id="focus-week-heading"
                    className="text-sm font-semibold text-slate-900 dark:text-slate-100"
                  >
                    Last 7 days focus time
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Recorded from completed focus sessions
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatMinutesHuman(summary.overview.weeklyFocusMinutes)}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-7 items-end gap-2">
                {summary.focusDailyHistory.map((day) => {
                  const pct =
                    day.focusMinutes > 0
                      ? Math.max(
                          10,
                          Math.round((day.focusMinutes / maxFocusMinutes) * 100),
                        )
                      : 4;
                  const weekday = new Intl.DateTimeFormat(undefined, {
                    weekday: "short",
                    timeZone: "UTC",
                  }).format(new Date(`${day.date}T12:00:00.000Z`));

                  return (
                    <div
                      key={day.date}
                      className="flex flex-col items-center gap-1.5"
                      title={`${day.date}: ${day.focusMinutes} minutes (${day.sessions} sessions)`}
                    >
                      <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                        {day.focusMinutes > 0 ? `${day.focusMinutes}m` : "0"}
                      </span>
                      <div className="flex h-20 w-full items-end rounded-md bg-slate-100 p-1 dark:bg-slate-800">
                        <div
                          className={`w-full rounded-sm transition-all ${
                            day.focusMinutes > 0
                              ? "bg-blue-600 dark:bg-blue-500"
                              : "bg-slate-200 dark:bg-slate-700"
                          }`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {weekday}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
