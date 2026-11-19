import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Pause, Play, RotateCcw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  focusService,
  type FocusOverview,
} from "../features/focus/services/focusService";
import { taskService } from "../features/tasks/services/taskService";
import type { Task } from "../features/tasks/types";
import { extractApiErrorMessage } from "../lib/api";
import { formatMinutesHuman } from "../utils/dates";
import {
  computeElapsedSeconds,
  computeRemainingSeconds,
  createIdleTimerState,
  formatTimerClock,
  loadPersistedTimerState,
  savePersistedTimerState,
  transitionPause,
  transitionStartOrResume,
  type FocusMode,
  type PersistedTimerState,
} from "../utils/focusTimer";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorBanner } from "../components/ui/States";

const MODE_LABELS: Record<FocusMode, string> = {
  FOCUS: "Focus",
  SHORT_BREAK: "Short break",
  LONG_BREAK: "Long break",
};

export function FocusPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryTaskId = searchParams.get("taskId");

  const defaultDurations: Record<FocusMode, number> = {
    FOCUS: user?.focusDurationMinutes ?? 25,
    SHORT_BREAK: user?.shortBreakMinutes ?? 5,
    LONG_BREAK: user?.longBreakMinutes ?? 15,
  };

  const [timer, setTimer] = useState<PersistedTimerState>(() => {
    const saved = loadPersistedTimerState();
    if (saved) return saved;
    return createIdleTimerState("FOCUS", defaultDurations.FOCUS);
  });

  const [customMinutes, setCustomMinutes] = useState<number>(() =>
    Math.round(timer.plannedSeconds / 60),
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [overview, setOverview] = useState<FocusOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const completingRef = useRef(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [focusData, tasksResult] = await Promise.all([
        focusService.getOverview(),
        taskService.list({ limit: 50, sortBy: "dueDate", sortOrder: "asc" }),
      ]);
      setOverview(focusData);
      const activeTasks = tasksResult.data.filter(
        (t) => t.status !== "COMPLETED",
      );
      setOpenTasks(activeTasks);

      if (queryTaskId) {
        const matched = activeTasks.find((t) => t.id === queryTaskId);
        if (matched) {
          setTimer((prev) => {
            if (prev.running || prev.sessionId) return prev;
            const next = { ...prev, taskId: matched.id, taskTitle: matched.title };
            savePersistedTimerState(next);
            return next;
          });
        }
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to load focus data."));
    }
  }, [queryTaskId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      focusService.getOverview(),
      taskService.list({ limit: 50, sortBy: "dueDate", sortOrder: "asc" }),
    ])
      .then(([focusData, tasksResult]) => {
        if (!active) return;
        setOverview(focusData);
        const activeTasks = tasksResult.data.filter(
          (t) => t.status !== "COMPLETED",
        );
        setOpenTasks(activeTasks);

        if (queryTaskId) {
          const matched = activeTasks.find((t) => t.id === queryTaskId);
          if (matched) {
            setTimer((prev) => {
              if (prev.running || prev.sessionId) return prev;
              const next = {
                ...prev,
                taskId: matched.id,
                taskTitle: matched.title,
              };
              savePersistedTimerState(next);
              return next;
            });
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(extractApiErrorMessage(err, "Failed to load focus data."));
      });
    return () => {
      active = false;
    };
  }, [queryTaskId]);

  // Persist timer changes so page reload preserves exact timestamp-based remaining time
  useEffect(() => {
    savePersistedTimerState(timer);
  }, [timer]);

  const finishActiveSession = useCallback(
    async (
      currentState: PersistedTimerState,
      status: "COMPLETED" | "CANCELLED",
    ) => {
      if (completingRef.current) return;
      completingRef.current = true;
      setSubmitting(true);
      setError(null);

      try {
        const elapsed = Math.max(
          1,
          computeElapsedSeconds(currentState, Date.now()),
        );
        if (currentState.sessionId) {
          await focusService.completeSession(currentState.sessionId, {
            actualSeconds:
              status === "COMPLETED"
                ? Math.max(elapsed, 60)
                : elapsed,
            status,
          });
        } else if (status === "COMPLETED") {
          // If user finishes before a session ID existed, create & complete cleanly
          const created = await focusService.startSession({
            taskId: currentState.taskId,
            sessionType: currentState.mode,
            plannedMinutes: Math.round(currentState.plannedSeconds / 60),
          });
          await focusService.completeSession(created.id, {
            actualSeconds: Math.max(elapsed, 60),
            status: "COMPLETED",
          });
        }

        const nextIdle = createIdleTimerState(
          currentState.mode,
          Math.round(currentState.plannedSeconds / 60),
          currentState.taskId,
          currentState.taskTitle,
        );
        setTimer(nextIdle);
        savePersistedTimerState(nextIdle);
        setStatusMessage(
          status === "COMPLETED"
            ? `${MODE_LABELS[currentState.mode]} session recorded.`
            : "Session reset.",
        );
        await loadData();
      } catch (err) {
        setError(
          extractApiErrorMessage(err, "Could not save focus session."),
        );
      } finally {
        setSubmitting(false);
        completingRef.current = false;
      }
    },
    [loadData],
  );

  // Tick UI clock every 250ms while running (elapsed/remaining always computed from Date.now())
  useEffect(() => {
    if (!timer.running) return;
    const interval = window.setInterval(() => {
      const currentNow = Date.now();
      setNowMs(currentNow);
      const rem = computeRemainingSeconds(timer, currentNow);
      if (rem <= 0) {
        window.clearInterval(interval);
        finishActiveSession(timer, "COMPLETED");
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [timer, finishActiveSession]);

  const remainingSeconds = computeRemainingSeconds(timer, nowMs);
  const progressPct = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        ((timer.plannedSeconds - remainingSeconds) / timer.plannedSeconds) *
          100,
      ),
    ),
  );

  // Sync browser document title while timer is active
  useEffect(() => {
    if (timer.running) {
      document.title = `${formatTimerClock(remainingSeconds)} · ${MODE_LABELS[timer.mode]} — FocusFlow`;
    } else {
      document.title = "FocusFlow — Tasks, Habits & Deep Work";
    }
    return () => {
      document.title = "FocusFlow — Tasks, Habits & Deep Work";
    };
  }, [timer.running, timer.mode, remainingSeconds]);

  const handleSelectMode = (mode: FocusMode) => {
    if (timer.running) return;
    const mins = defaultDurations[mode];
    setCustomMinutes(mins);
    setStatusMessage(null);
    setTimer(createIdleTimerState(mode, mins, timer.taskId, timer.taskTitle));
  };

  const handleDurationChange = (minutes: number) => {
    if (timer.running || timer.sessionId) return;
    const clamped = Math.min(120, Math.max(1, minutes));
    setCustomMinutes(clamped);
    setTimer(
      createIdleTimerState(timer.mode, clamped, timer.taskId, timer.taskTitle),
    );
  };

  const handleTaskChange = (taskId: string) => {
    const matched = openTasks.find((t) => t.id === taskId) ?? null;
    setTimer((prev) => ({
      ...prev,
      taskId: matched?.id ?? null,
      taskTitle: matched?.title ?? null,
    }));
  };

  const handleStartOrResume = async () => {
    setError(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      let sessionId = timer.sessionId;
      if (!sessionId) {
        const created = await focusService.startSession({
          taskId: timer.taskId,
          sessionType: timer.mode,
          plannedMinutes: Math.round(timer.plannedSeconds / 60),
        });
        sessionId = created.id;
      }
      const now = Date.now();
      setNowMs(now);
      setTimer((prev) => transitionStartOrResume(prev, sessionId, now));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not start focus session."));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = () => {
    const now = Date.now();
    setNowMs(now);
    setTimer((prev) => transitionPause(prev, now));
  };

  const handleReset = async () => {
    if (timer.sessionId) {
      await finishActiveSession(timer, "CANCELLED");
    } else {
      setTimer(
        createIdleTimerState(
          timer.mode,
          customMinutes,
          timer.taskId,
          timer.taskTitle,
        ),
      );
      setStatusMessage(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Focus mode
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Run distraction-free work blocks linked to a single task. Timer state
          survives page refreshes.
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {statusMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Timer Surface */}
        <section
          aria-label="Focus timer"
          className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7"
        >
          {/* Mode Tabs */}
          <div
            role="tablist"
            aria-label="Session mode"
            className="inline-flex w-full rounded-lg bg-slate-100 p-1 sm:w-auto dark:bg-slate-800"
          >
            {(["FOCUS", "SHORT_BREAK", "LONG_BREAK"] as FocusMode[]).map(
              (mode) => {
                const active = timer.mode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={timer.running}
                    onClick={() => handleSelectMode(mode)}
                    className={`min-h-[36px] flex-1 rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:flex-none disabled:cursor-not-allowed ${
                      active
                        ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    }`}
                  >
                    {MODE_LABELS[mode]}
                  </button>
                );
              },
            )}
          </div>

          {/* Clock Display */}
          <div className="my-10 text-center">
            <p
              data-testid="focus-clock"
              className="font-mono text-6xl font-semibold tracking-tight tabular-nums text-slate-900 sm:text-7xl dark:text-slate-100"
            >
              {formatTimerClock(remainingSeconds)}
            </p>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {timer.taskTitle
                ? `Working on: ${timer.taskTitle}`
                : "No task linked — optional below"}
            </p>

            {/* Thin progress bar */}
            <div className="mx-auto mt-6 h-1.5 max-w-md overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Primary Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!timer.running ? (
              <Button
                size="lg"
                loading={submitting}
                onClick={handleStartOrResume}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                {timer.sessionId ? "Resume" : "Start session"}
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={handlePause}>
                <Pause className="h-4 w-4" aria-hidden="true" />
                Pause
              </Button>
            )}

            {timer.sessionId && (
              <Button
                size="lg"
                variant="secondary"
                disabled={submitting}
                onClick={() => finishActiveSession(timer, "COMPLETED")}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Complete &amp; log
              </Button>
            )}

            <Button
              size="lg"
              variant="ghost"
              disabled={submitting}
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </Button>
          </div>

          {/* Session Configuration */}
          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2 dark:border-slate-800">
            <div className="space-y-1.5">
              <label
                htmlFor="focus-task-select"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Linked task
              </label>
              <select
                id="focus-task-select"
                value={timer.taskId ?? ""}
                onChange={(e) => handleTaskChange(e.target.value)}
                disabled={timer.running}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">No task linked</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="focus-duration-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Duration (minutes)
              </label>
              <input
                id="focus-duration-input"
                type="number"
                min={1}
                max={120}
                value={customMinutes}
                disabled={timer.running || Boolean(timer.sessionId)}
                onChange={(e) =>
                  handleDurationChange(Number.parseInt(e.target.value, 10) || 25)
                }
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm tabular-nums text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>
        </section>

        {/* Right Column: Real Stats & Recent Sessions */}
        <div className="space-y-6 lg:col-span-5">
          <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            <div className="p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Today</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {overview ? formatMinutesHuman(overview.todayFocusMinutes) : "—"}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sessions
              </p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {overview ? overview.todayCompletedSessions : "—"}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                7 days
              </p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {overview
                  ? formatMinutesHuman(overview.weeklyFocusMinutes)
                  : "—"}
              </p>
            </div>
          </div>

          <section aria-labelledby="recent-sessions-heading" className="space-y-3">
            <h2
              id="recent-sessions-heading"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Recent sessions
            </h2>

            {!overview || overview.recentSessions.length === 0 ? (
              <EmptyState
                title="No focus sessions logged yet"
                description="Start a timer and complete a session to see your real deep-work history here."
              />
            ) : (
              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {overview.recentSessions.slice(0, 8).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                        {s.taskTitle || MODE_LABELS[s.sessionType]}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {MODE_LABELS[s.sessionType]} ·{" "}
                        {s.status === "COMPLETED"
                          ? "Completed"
                          : s.status === "CANCELLED"
                            ? "Cancelled"
                            : "In progress"}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">
                      {Math.max(1, Math.round(s.actualSeconds / 60))}m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
