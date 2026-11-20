import React, { useMemo, useState } from "react";
import { Calendar, Clock, RotateCcw, Sparkles } from "lucide-react";
import type {
  AiDecomposeResponse,
  AiSubtaskPriority,
  Category,
  CreateTaskPayload,
  Task,
  TaskPriority,
} from "../features/tasks/types";
import { taskService } from "../features/tasks/services/taskService";
import { extractApiErrorMessage } from "../lib/api";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { ErrorBanner } from "./ui/States";

interface EditableSubtask {
  key: string;
  selected: boolean;
  title: string;
  description: string;
  estimatedPomodoros: number;
  priority: AiSubtaskPriority;
  suggestedCategoryId: string;
  suggestedDueDate: string;
}

interface AiDecomposeModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onCreated: (createdTasks: Task[]) => Promise<void> | void;
}

const POMODORO_MINUTES = 25;

const PRIORITY_TO_API: Record<AiSubtaskPriority, TaskPriority> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};

function formatDurationMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function DecomposeLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Generating task breakdown"
      className="space-y-4 pt-1"
    >
      <div className="rounded-xl border border-blue-200/70 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-blue-300 dark:bg-blue-800" />
          <div className="h-3.5 w-36 animate-pulse rounded bg-blue-200 dark:bg-blue-900" />
        </div>
        <div className="mt-2.5 h-4 w-4/5 animate-pulse rounded bg-blue-200/80 dark:bg-blue-900/70" />
      </div>

      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 h-4 w-4 shrink-0 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="h-7 w-28 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800/70" />
                  <div className="h-7 w-24 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800/70" />
                  <div className="h-7 w-32 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800/70" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">
        Analyzing your workspace and breaking down your goal into subtasks…
      </span>
    </div>
  );
}

export function AiDecomposeModal({
  open,
  onClose,
  categories,
  onCreated,
}: AiDecomposeModalProps) {
  const [goal, setGoal] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiDecomposeResponse | null>(null);
  const [drafts, setDrafts] = useState<EditableSubtask[]>([]);

  const handleClose = () => {
    if (isCommitting) return;
    setError(null);
    setIsGenerating(false);
    onClose();
  };

  const trimmedGoal = goal.trim();
  const goalTooShort = trimmedGoal.length > 0 && trimmedGoal.length < 5;
  const canGenerate =
    trimmedGoal.length >= 5 && trimmedGoal.length <= 300 && !isGenerating && !isCommitting;

  const selectedDrafts = useMemo(
    () => drafts.filter((item) => item.selected),
    [drafts],
  );

  const totalSelectedPomodoros = useMemo(
    () =>
      selectedDrafts.reduce((sum, item) => sum + item.estimatedPomodoros, 0),
    [selectedDrafts],
  );

  const hasInvalidSelectedTitle = useMemo(
    () => selectedDrafts.some((item) => item.title.trim().length === 0),
    [selectedDrafts],
  );

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canGenerate) return;

    setError(null);
    setIsGenerating(true);

    try {
      const response = await taskService.decomposeGoal({
        goal: trimmedGoal,
        targetDate: targetDate || undefined,
        autoCreate: false,
      });
      setResult(response);
      setDrafts(
        response.subtasks.map((sub, idx) => ({
          key: `${Date.now()}-${idx}`,
          selected: true,
          title: sub.title,
          description: sub.description,
          estimatedPomodoros: sub.estimatedPomodoros,
          priority: sub.priority,
          suggestedCategoryId: sub.suggestedCategoryId ?? "",
          suggestedDueDate: sub.suggestedDueDate
            ? sub.suggestedDueDate.slice(0, 10)
            : "",
        })),
      );
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          "Could not generate task breakdown. Please try again.",
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const updateDraft = (
    key: string,
    patch: Partial<EditableSubtask>,
  ) => {
    setDrafts((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const handleToggleAll = () => {
    const allSelected = drafts.length > 0 && selectedDrafts.length === drafts.length;
    setDrafts((prev) =>
      prev.map((item) => ({ ...item, selected: !allSelected })),
    );
  };

  const handleCreateSelected = async () => {
    if (selectedDrafts.length === 0 || hasInvalidSelectedTitle || isCommitting) {
      return;
    }

    setError(null);
    setIsCommitting(true);
    try {
      const payloads: CreateTaskPayload[] = selectedDrafts.map((item) => ({
        title: item.title.trim(),
        description: item.description.trim() || null,
        priority: PRIORITY_TO_API[item.priority],
        status: "TODO",
        categoryId: item.suggestedCategoryId || null,
        dueDate: item.suggestedDueDate || null,
        estimatedMinutes: item.estimatedPomodoros * POMODORO_MINUTES,
        isImportant: item.priority === "high",
        tagIds: [],
      }));

      const created = await taskService.createBulk(payloads);
      setGoal("");
      setTargetDate("");
      setResult(null);
      setDrafts([]);
      await onCreated(created);
      onClose();
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          "Could not save selected tasks. No tasks were created.",
        ),
      );
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="AI Task Decomposer"
      description="Turn a broad goal into prioritized, Pomodoro-sized subtasks tailored to your workspace."
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5">
        <form onSubmit={handleGenerate} className="space-y-3.5">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor="ai-goal-input"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Goal to break down
              </label>
              <span
                className={`font-mono text-xs tabular-nums ${
                  trimmedGoal.length > 300
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {trimmedGoal.length}/300
              </span>
            </div>
            <textarea
              id="ai-goal-input"
              rows={2}
              maxLength={300}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={isGenerating || isCommitting}
              placeholder="e.g., Build authentication and role-based access control"
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {goalTooShort && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Enter at least 5 characters so the breakdown has enough context.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-[220px]">
              <label
                htmlFor="ai-target-date"
                className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Target deadline (optional)
              </label>
              <input
                id="ai-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                disabled={isGenerating || isCommitting}
                className="block min-h-[38px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <Button
              type="submit"
              disabled={!canGenerate}
              loading={isGenerating}
            >
              {result ? (
                <>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Regenerate
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Generate breakdown
                </>
              )}
            </Button>
          </div>
        </form>

        {error && (
          <ErrorBanner
            message={error}
            onRetry={canGenerate ? () => handleGenerate() : undefined}
          />
        )}

        {isGenerating && <DecomposeLoadingSkeleton />}

        {!isGenerating && result && drafts.length > 0 && (
          <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            {/* Strategy summary */}
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/70 px-4 py-3 dark:border-blue-900/60 dark:bg-blue-950/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Execution strategy
                </span>
                <span className="font-mono text-xs tabular-nums text-blue-700/80 dark:text-blue-300/80">
                  Context: {result.workspaceContext.pendingTaskCount} pending ·{" "}
                  {result.workspaceContext.categoriesCount}{" "}
                  {result.workspaceContext.categoriesCount === 1
                    ? "category"
                    : "categories"}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {result.strategySummary}
              </p>
            </div>

            {/* Subtask list header */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Review and customize subtasks before adding them to your list
              </p>
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {selectedDrafts.length === drafts.length
                  ? "Deselect all"
                  : "Select all"}
              </button>
            </div>

            {/* Interactive subtask preview cards */}
            <div className="space-y-2.5">
              {drafts.map((item, idx) => (
                <div
                  key={item.key}
                  className={`rounded-xl border p-3.5 transition-opacity ${
                    item.selected
                      ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60"
                      : "border-slate-200/70 bg-slate-50/60 opacity-60 dark:border-slate-800/60 dark:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) =>
                        updateDraft(item.key, { selected: e.target.checked })
                      }
                      aria-label={`Include subtask ${idx + 1}: ${item.title || "Untitled"}`}
                      className="mt-2 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:border-slate-600 dark:bg-slate-900"
                    />

                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        type="text"
                        value={item.title}
                        maxLength={140}
                        onChange={(e) =>
                          updateDraft(item.key, { title: e.target.value })
                        }
                        aria-label={`Subtask ${idx + 1} title`}
                        placeholder="Subtask title"
                        className="block w-full rounded-md border border-slate-200 bg-transparent px-2.5 py-1.5 text-sm font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:text-slate-100 dark:focus:bg-slate-900"
                      />

                      <textarea
                        rows={2}
                        maxLength={2000}
                        value={item.description}
                        onChange={(e) =>
                          updateDraft(item.key, { description: e.target.value })
                        }
                        aria-label={`Subtask ${idx + 1} description`}
                        placeholder="Acceptance criteria or notes"
                        className="block w-full rounded-md border border-slate-200/80 bg-transparent px-2.5 py-1.5 text-xs leading-5 text-slate-600 focus:border-blue-600 focus:bg-white focus:text-slate-900 focus:outline-none dark:border-slate-800 dark:text-slate-400 dark:focus:bg-slate-900 dark:focus:text-slate-200"
                      />

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {/* Pomodoro selector */}
                        <label className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          <Clock
                            className="h-3.5 w-3.5 text-slate-400"
                            aria-hidden="true"
                          />
                          <span className="sr-only">
                            Estimated Pomodoros for subtask {idx + 1}
                          </span>
                          <select
                            aria-label={`Estimated Pomodoros for subtask ${idx + 1}`}
                            value={item.estimatedPomodoros}
                            onChange={(e) =>
                              updateDraft(item.key, {
                                estimatedPomodoros: Number(e.target.value),
                              })
                            }
                            className="bg-transparent font-mono text-xs font-medium text-slate-800 focus:outline-none dark:text-slate-200"
                          >
                            <option value={1}>1 Pom · 25m</option>
                            <option value={2}>2 Pom · 50m</option>
                            <option value={3}>3 Pom · 75m</option>
                            <option value={4}>4 Pom · 100m</option>
                          </select>
                        </label>

                        {/* Priority selector */}
                        <select
                          aria-label={`Priority for subtask ${idx + 1}`}
                          value={item.priority}
                          onChange={(e) =>
                            updateDraft(item.key, {
                              priority: e.target.value as AiSubtaskPriority,
                            })
                          }
                          className="min-h-[30px] rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          <option value="low">Low priority</option>
                          <option value="medium">Medium priority</option>
                          <option value="high">High priority</option>
                        </select>

                        {/* Category selector */}
                        {categories.length > 0 && (
                          <select
                            aria-label={`Category for subtask ${idx + 1}`}
                            value={item.suggestedCategoryId}
                            onChange={(e) =>
                              updateDraft(item.key, {
                                suggestedCategoryId: e.target.value,
                              })
                            }
                            className="min-h-[30px] rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          >
                            <option value="">No category</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Due date selector */}
                        <label className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          <Calendar
                            className="h-3.5 w-3.5 text-slate-400"
                            aria-hidden="true"
                          />
                          <span className="sr-only">
                            Due date for subtask {idx + 1}
                          </span>
                          <input
                            type="date"
                            aria-label={`Due date for subtask ${idx + 1}`}
                            value={item.suggestedDueDate}
                            onChange={(e) =>
                              updateDraft(item.key, {
                                suggestedDueDate: e.target.value,
                              })
                            }
                            className="bg-transparent font-mono text-xs text-slate-800 focus:outline-none dark:text-slate-200"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasInvalidSelectedTitle && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Every selected subtask must have a non-empty title.
              </p>
            )}

            {/* Modal footer */}
            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <p className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {selectedDrafts.length} of {drafts.length} selected ·{" "}
                {totalSelectedPomodoros}{" "}
                {totalSelectedPomodoros === 1 ? "Pomodoro" : "Pomodoros"} (
                {formatDurationMinutes(totalSelectedPomodoros * POMODORO_MINUTES)}
                )
              </p>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isCommitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSelected}
                  loading={isCommitting}
                  disabled={
                    selectedDrafts.length === 0 || hasInvalidSelectedTitle
                  }
                >
                  Create Selected Tasks
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
