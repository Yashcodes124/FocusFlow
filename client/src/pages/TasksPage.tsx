import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isCancel } from "axios";
import {
  Check,
  Download,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { taskService } from "../features/tasks/services/taskService";
import type {
  Category,
  CreateTaskPayload,
  Tag,
  Task,
  TaskAttachment,
  TaskListFilters,
  TaskPriority,
  TaskStatus,
} from "../features/tasks/types";
import { extractApiErrorMessage } from "../lib/api";
import { formatShortDate, isTaskOverdue } from "../utils/dates";
import {
  getDescriptionSnippet,
  matchesTaskSearch,
  splitHighlightSegments,
} from "../utils/taskSearch";
import {
  ATTACHMENT_ACCEPT,
  formatBytes,
  MAX_ATTACHMENTS_PER_TASK,
  readFileAsBase64,
  triggerBlobDownload,
  validateAttachmentFile,
} from "../utils/attachments";
import { TASKS_CHANGED_EVENT } from "../utils/shortcuts";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { TaskFormModal } from "../components/TaskFormModal";
import { AiDecomposeModal } from "../components/AiDecomposeModal";
import { EmptyState, ErrorBanner, LoadingRows } from "../components/ui/States";

function HighlightedText({ text, query }: { text: string; query: string }) {
  const segments = splitHighlightSegments(text, query);
  return (
    <>
      {segments.map((seg, idx) =>
        seg.matched ? (
          <mark
            key={idx}
            className="rounded-xs bg-blue-100 px-0.5 text-slate-900 dark:bg-blue-500/30 dark:text-slate-100"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={idx}>{seg.text}</span>
        ),
      )}
    </>
  );
}

const PRIORITY_STYLES: Record<TaskPriority, { label: string; className: string }> = {
  HIGH: { label: "High", className: "font-medium text-red-600 dark:text-red-400" },
  MEDIUM: {
    label: "Medium",
    className: "font-medium text-amber-600 dark:text-amber-400",
  },
  LOW: { label: "Low", className: "text-slate-500 dark:text-slate-400" },
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export function TasksPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dueFilter, setDueFilter] = useState<
    "all" | "today" | "overdue" | "upcoming" | "no_date"
  >(
    (searchParams.get("due") as
      | "all"
      | "today"
      | "overdue"
      | "upcoming"
      | "no_date") || "all",
  );
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") || "",
  );
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(
    () => searchParams.get("q") || "",
  );
  const appliedSearchRef = useRef(searchParams.get("q")?.trim() || "");
  const [sortBy, setSortBy] =
    useState<NonNullable<TaskListFilters["sortBy"]>>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailAttachError, setDetailAttachError] = useState<string | null>(
    null,
  );
  const [uploadingDetailAttachment, setUploadingDetailAttachment] =
    useState(false);
  const detailFileInputRef = useRef<HTMLInputElement | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTasks = useCallback(
    async (queryOverride?: string) => {
      activeRequestRef.current?.abort();
      const controller = new AbortController();
      activeRequestRef.current = controller;

      const effectiveSearch =
        queryOverride !== undefined ? queryOverride : searchQuery;

      setError(null);
      setIsRefreshing(true);
      try {
        const res = await taskService.list(
          {
            status: statusFilter,
            priority: priorityFilter,
            categoryId: categoryFilter || undefined,
            dueFilter,
            search: effectiveSearch,
            sortBy,
            sortOrder,
            page,
            limit: 25,
          },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setTasks(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        appliedSearchRef.current = effectiveSearch.trim();
        setAppliedSearchQuery(effectiveSearch.trim());
      } catch (err) {
        if (isCancel(err) || controller.signal.aborted) return;
        setError(extractApiErrorMessage(err, "Failed to load tasks."));
      } finally {
        if (!controller.signal.aborted) {
          setInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [
      statusFilter,
      priorityFilter,
      categoryFilter,
      dueFilter,
      searchQuery,
      sortBy,
      sortOrder,
      page,
    ],
  );

  useEffect(() => {
    let active = true;
    Promise.all([taskService.listCategories(), taskService.listTags()])
      .then(([cats, tagList]) => {
        if (!active) return;
        setCategories(cats);
        setTags(tagList);
      })
      .catch(() => {
        // Non-fatal taxonomy load failure
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const delayMs = searchQuery.trim() === appliedSearchRef.current ? 0 : 180;
    const timer = window.setTimeout(() => {
      loadTasks();
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadTasks, searchQuery]);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

  // Press "/" outside inputs to focus search quickly
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Sync with global shortcut events & query flags (?focusSearch=1, ?aiDecompose=1)
  useEffect(() => {
    const onTasksChanged = () => {
      void loadTasks();
    };
    const onOpenAiDecompose = () => {
      setAiModalOpen(true);
    };
    window.addEventListener(TASKS_CHANGED_EVENT, onTasksChanged);
    window.addEventListener("focusflow:open-ai-decompose", onOpenAiDecompose);
    return () => {
      window.removeEventListener(TASKS_CHANGED_EVENT, onTasksChanged);
      window.removeEventListener(
        "focusflow:open-ai-decompose",
        onOpenAiDecompose,
      );
    };
  }, [loadTasks]);

  useEffect(() => {
    const shouldFocusSearch = searchParams.get("focusSearch") === "1";
    const shouldOpenAi = searchParams.get("aiDecompose") === "1";
    if (!shouldFocusSearch && !shouldOpenAi) return;

    const timer = window.setTimeout(() => {
      if (shouldFocusSearch) {
        searchInputRef.current?.focus();
      }
      if (shouldOpenAi) {
        setAiModalOpen(true);
      }
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("focusSearch");
      nextParams.delete("aiDecompose");
      setSearchParams(nextParams, { replace: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [searchParams, setSearchParams]);

  // Instant client-side narrowing on every keystroke while server results reconcile
  const visibleTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    return tasks.filter((task) => matchesTaskSearch(task, searchQuery));
  }, [tasks, searchQuery]);

  const displayedTotal =
    searchQuery.trim() !== appliedSearchQuery ? visibleTasks.length : total;

  const handleSaveTask = async (
    payload: CreateTaskPayload,
    taskId?: string,
  ): Promise<Task> => {
    let saved: Task;
    if (taskId) {
      saved = await taskService.update(taskId, payload);
      if (detailTask?.id === taskId) {
        setDetailTask(saved);
      }
    } else {
      saved = await taskService.create(payload);
    }
    await loadTasks();
    return saved;
  };

  const handleDetailAttachmentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !detailTask) return;

    setDetailAttachError(null);
    const validationErr = validateAttachmentFile(file);
    if (validationErr) {
      setDetailAttachError(validationErr);
      return;
    }

    setUploadingDetailAttachment(true);
    try {
      const dataBase64 = await readFileAsBase64(file);
      const created = await taskService.uploadAttachment(detailTask.id, {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64,
      });
      setDetailTask((prev) =>
        prev
          ? { ...prev, attachments: [...(prev.attachments ?? []), created] }
          : null,
      );
      await loadTasks();
    } catch (err) {
      setDetailAttachError(
        extractApiErrorMessage(err, "Could not upload attachment."),
      );
    } finally {
      setUploadingDetailAttachment(false);
    }
  };

  const handleDetailAttachmentDownload = async (attachment: TaskAttachment) => {
    if (!detailTask) return;
    setDetailAttachError(null);
    try {
      const blob = await taskService.downloadAttachment(
        detailTask.id,
        attachment.id,
      );
      triggerBlobDownload(blob, attachment.fileName);
    } catch (err) {
      setDetailAttachError(
        extractApiErrorMessage(err, "Could not download attachment."),
      );
    }
  };

  const handleDetailAttachmentDelete = async (attachment: TaskAttachment) => {
    if (!detailTask) return;
    setDetailAttachError(null);
    try {
      await taskService.deleteAttachment(detailTask.id, attachment.id);
      setDetailTask((prev) =>
        prev
          ? {
              ...prev,
              attachments: (prev.attachments ?? []).filter(
                (item) => item.id !== attachment.id,
              ),
            }
          : null,
      );
      await loadTasks();
    } catch (err) {
      setDetailAttachError(
        extractApiErrorMessage(err, "Could not remove attachment."),
      );
    }
  };

  const handleToggle = async (task: Task) => {
    setBusyId(task.id);
    try {
      const updated = await taskService.toggleComplete(task.id);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      if (detailTask?.id === task.id) setDetailTask(updated);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not update task."));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (task: Task) => {
    setBusyId(task.id);
    try {
      await taskService.remove(task.id);
      if (detailTask?.id === task.id) setDetailTask(null);
      await loadTasks();
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not delete task."));
    } finally {
      setBusyId(null);
    }
  };

  const hasActiveFilters = Boolean(
    statusFilter ||
      priorityFilter ||
      categoryFilter ||
      dueFilter !== "all" ||
      searchQuery.trim(),
  );

  const resetFilters = () => {
    setStatusFilter("");
    setPriorityFilter("");
    setCategoryFilter("");
    setDueFilter("all");
    setSearchQuery("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums">{displayedTotal}</span>{" "}
            {displayedTotal === 1 ? "task" : "tasks"} matching your current view
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setAiModalOpen(true)}
          >
            <Sparkles
              className="h-4 w-4 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            AI Break Down Goal
            <kbd
              aria-hidden="true"
              className="ml-1 hidden rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] font-normal text-slate-500 lg:inline dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            >
              Alt+A
            </kbd>
          </Button>
          <Button
            onClick={() => {
              setEditingTask(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New task
            <kbd
              aria-hidden="true"
              className="ml-1 hidden rounded border border-white/25 bg-white/15 px-1.5 py-0.5 font-mono text-[10px] font-normal text-white/90 lg:inline"
            >
              N
            </kbd>
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Status segmented tabs */}
          <div
            role="tablist"
            aria-label="Filter by status"
            className="inline-flex w-full overflow-x-auto rounded-lg bg-slate-100 p-1 sm:w-auto dark:bg-slate-800"
          >
            {(
              [
                { value: "", label: "All" },
                { value: "TODO", label: "To do" },
                { value: "IN_PROGRESS", label: "In progress" },
                { value: "COMPLETED", label: "Completed" },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.value || "all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPage(1);
                  }}
                  className={`min-h-[34px] rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Real-time search input (filters by title & description) */}
          <div className="relative w-full md:max-w-sm">
            {isRefreshing && !initialLoading ? (
              <Loader2
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
            ) : (
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
            )}
            <label htmlFor="task-search" className="sr-only">
              Search tasks by title or description
            </label>
            <input
              ref={searchInputRef}
              id="task-search"
              type="text"
              role="searchbox"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && searchQuery) {
                  e.preventDefault();
                  setSearchQuery("");
                  setPage(1);
                }
              }}
              placeholder="Search title or description…"
              className={`min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900 ${
                searchQuery ? "pr-9" : "pr-16"
              }`}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400 lg:inline dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
              >
                Ctrl+K
              </kbd>
            )}
          </div>
        </div>

        {/* Secondary filter controls */}
        <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as TaskPriority | "");
              setPage(1);
            }}
            className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">All priorities</option>
            <option value="HIGH">High priority</option>
            <option value="MEDIUM">Medium priority</option>
            <option value="LOW">Low priority</option>
          </select>

          <select
            aria-label="Filter by due date"
            value={dueFilter}
            onChange={(e) => {
              setDueFilter(
                e.target.value as
                  | "all"
                  | "today"
                  | "overdue"
                  | "upcoming"
                  | "no_date",
              );
              setPage(1);
            }}
            className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All dates</option>
            <option value="today">Due today</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
            <option value="no_date">No due date</option>
          </select>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort tasks"
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split(":") as [
                NonNullable<TaskListFilters["sortBy"]>,
                "asc" | "desc",
              ];
              setSortBy(field);
              setSortOrder(order);
            }}
            className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="createdAt:desc">Newest first</option>
            <option value="dueDate:asc">Due date (soonest)</option>
            <option value="priority:desc">Priority (high to low)</option>
            <option value="title:asc">Title (A–Z)</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => loadTasks()} />}

      {bulkNotice && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          <span>{bulkNotice}</span>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  setBulkNotice(null);
                }}
                className="text-xs font-semibold underline underline-offset-2 hover:opacity-80"
              >
                Show all tasks
              </button>
            )}
            <button
              type="button"
              onClick={() => setBulkNotice(null)}
              aria-label="Dismiss notification"
              className="text-emerald-700 hover:opacity-80 dark:text-emerald-300"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Task List */}
      {initialLoading ? (
        <LoadingRows count={5} />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          title={
            searchQuery.trim()
              ? `No tasks match "${searchQuery.trim()}"`
              : hasActiveFilters
                ? "No tasks match these filters"
                : "No tasks yet"
          }
          description={
            hasActiveFilters
              ? "Try a different keyword across title or description, or clear active filters."
              : "Add your first task with a clear outcome and due date to build momentum."
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAiModalOpen(true)}
                >
                  <Sparkles
                    className="h-4 w-4 text-blue-600 dark:text-blue-400"
                    aria-hidden="true"
                  />
                  AI Break Down Goal
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTask(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create your first task
                </Button>
              </div>
            )
          }
        />
      ) : (
        <div
          aria-busy={isRefreshing}
          className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900"
        >
          {visibleTasks.map((task) => {
            const completed = task.status === "COMPLETED";
            const overdue = isTaskOverdue(task.dueDate, task.status);
            const pStyle = PRIORITY_STYLES[task.priority];
            const descriptionSnippet = getDescriptionSnippet(
              task.description,
              searchQuery,
            );

            return (
              <div
                key={task.id}
                className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-800/40"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <button
                    type="button"
                    disabled={busyId === task.id}
                    onClick={() => handleToggle(task)}
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
                    {completed && (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailTask(task)}
                        className={`truncate text-left text-sm font-medium hover:text-blue-600 focus-visible:outline-none focus-visible:underline dark:hover:text-blue-400 ${
                          completed
                            ? "text-slate-400 line-through dark:text-slate-500"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        <HighlightedText text={task.title} query={searchQuery} />
                      </button>
                      {task.isImportant && (
                        <Star
                          className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500"
                          aria-label="Important"
                        />
                      )}
                    </div>

                    {descriptionSnippet && (
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        <HighlightedText
                          text={descriptionSnippet}
                          query={searchQuery}
                        />
                      </p>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className={pStyle.className}>{pStyle.label}</span>
                      <span aria-hidden="true">·</span>
                      <span>{STATUS_LABELS[task.status]}</span>
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
                              overdue
                                ? "font-medium text-red-600 dark:text-red-400"
                                : ""
                            }
                          >
                            {overdue ? "Overdue · " : "Due "}
                            {formatShortDate(task.dueDate)}
                          </span>
                        </>
                      )}
                      {task.estimatedMinutes && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {task.estimatedMinutes}m
                          </span>
                        </>
                      )}
                      {task.tags.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {task.tags.map((t) => `#${t.name}`).join(" ")}
                          </span>
                        </>
                      )}
                      {(task.attachments?.length ?? 0) > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-500 dark:text-slate-400"
                            aria-label={`${task.attachments!.length} ${task.attachments!.length === 1 ? "attachment" : "attachments"}`}
                          >
                            <Paperclip
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            {task.attachments!.length}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 pl-8 sm:pl-0">
                  {!completed && (
                    <button
                      type="button"
                      onClick={() => navigate(`/focus?taskId=${task.id}`)}
                      aria-label={`Focus on "${task.title}"`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                    >
                      <Timer className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTask(task);
                      setFormOpen(true);
                    }}
                    aria-label={`Edit "${task.title}"`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={busyId === task.id}
                    onClick={() => handleDelete(task)}
                    aria-label={`Delete "${task.title}"`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span className="font-mono text-xs tabular-nums">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <TaskFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        categories={categories}
        tags={tags}
        onSave={handleSaveTask}
        onAttachmentsChanged={loadTasks}
      />

      {/* AI Task Decomposer Modal */}
      <AiDecomposeModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        categories={categories}
        onCreated={async (createdTasks) => {
          setBulkNotice(
            `Added ${createdTasks.length} ${
              createdTasks.length === 1 ? "subtask" : "subtasks"
            } from your AI breakdown.`,
          );
          await loadTasks();
        }}
      />

      {/* Task Detail Modal */}
      <Modal
        open={Boolean(detailTask)}
        onClose={() => {
          setDetailTask(null);
          setDetailAttachError(null);
        }}
        title={detailTask?.title ?? ""}
      >
        {detailTask && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className={PRIORITY_STYLES[detailTask.priority].className}>
                {PRIORITY_STYLES[detailTask.priority].label} priority
              </span>
              <span aria-hidden="true">·</span>
              <span>{STATUS_LABELS[detailTask.status]}</span>
              <span aria-hidden="true">·</span>
              <span>
                {detailTask.dueDate
                  ? `Due ${formatShortDate(detailTask.dueDate)}`
                  : "No due date"}
              </span>
              {detailTask.estimatedMinutes && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{detailTask.estimatedMinutes} min estimate</span>
                </>
              )}
            </div>

            {detailTask.description ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                {detailTask.description}
              </p>
            ) : (
              <p className="text-sm italic text-slate-400 dark:text-slate-500">
                No description provided.
              </p>
            )}

            <dl className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-xs dark:border-slate-800">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Category</dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                  {detailTask.category?.name ?? "None"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Tags</dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                  {detailTask.tags.length > 0
                    ? detailTask.tags.map((t) => `#${t.name}`).join(", ")
                    : "None"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Created</dt>
                <dd className="mt-0.5 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  {new Date(detailTask.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Updated</dt>
                <dd className="mt-0.5 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  {new Date(detailTask.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>

            {/* Quick Attachments in Detail Modal */}
            <div className="space-y-2.5 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Quick attachments{" "}
                  <span className="font-mono tabular-nums">
                    ({detailTask.attachments?.length ?? 0}/
                    {MAX_ATTACHMENTS_PER_TASK})
                  </span>
                </p>
                <input
                  ref={detailFileInputRef}
                  type="file"
                  accept={ATTACHMENT_ACCEPT}
                  onChange={handleDetailAttachmentUpload}
                  aria-label="Upload quick attachment"
                  className="sr-only"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={uploadingDetailAttachment}
                  disabled={
                    (detailTask.attachments?.length ?? 0) >=
                    MAX_ATTACHMENTS_PER_TASK
                  }
                  onClick={() => detailFileInputRef.current?.click()}
                >
                  <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                  Attach file
                </Button>
              </div>

              {detailAttachError && (
                <p
                  role="alert"
                  className="text-xs text-red-600 dark:text-red-400"
                >
                  {detailAttachError}
                </p>
              )}

              {(detailTask.attachments?.length ?? 0) > 0 ? (
                <ul className="space-y-1.5">
                  {detailTask.attachments!.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60"
                    >
                      <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-200">
                        {att.fileName}{" "}
                        <span className="font-mono font-normal text-slate-400">
                          ({formatBytes(att.sizeBytes)})
                        </span>
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDetailAttachmentDownload(att)}
                          aria-label={`Download ${att.fileName}`}
                          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDetailAttachmentDelete(att)}
                          aria-label={`Remove ${att.fileName}`}
                          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  No attachments yet. Add up to 2 small files (max 512 KB each).
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(detailTask)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </Button>
              <div className="flex items-center gap-2">
                {detailTask.status !== "COMPLETED" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const id = detailTask.id;
                      setDetailTask(null);
                      navigate(`/focus?taskId=${id}`);
                    }}
                  >
                    <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                    Focus
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTask(detailTask);
                    setDetailTask(null);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit task
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
