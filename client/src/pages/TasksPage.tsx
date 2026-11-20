import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  Pencil,
  Plus,
  Search,
  Star,
  Timer,
  Trash2,
} from "lucide-react";
import { taskService } from "../features/tasks/services/taskService";
import type {
  Category,
  CreateTaskPayload,
  Tag,
  Task,
  TaskListFilters,
  TaskPriority,
  TaskStatus,
} from "../features/tasks/types";
import { extractApiErrorMessage } from "../lib/api";
import { formatShortDate, isTaskOverdue } from "../utils/dates";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { TaskFormModal } from "../components/TaskFormModal";
import { EmptyState, ErrorBanner, LoadingRows } from "../components/ui/States";

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
  const [searchParams] = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] =
    useState<NonNullable<TaskListFilters["sortBy"]>>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await taskService.list({
        status: statusFilter,
        priority: priorityFilter,
        categoryId: categoryFilter || undefined,
        dueFilter,
        search: searchQuery,
        sortBy,
        sortOrder,
        page,
        limit: 25,
      });
      setTasks(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to load tasks."));
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    priorityFilter,
    categoryFilter,
    dueFilter,
    searchQuery,
    sortBy,
    sortOrder,
    page,
  ]);

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
    const timer = window.setTimeout(() => {
      loadTasks();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [loadTasks]);

  const handleSaveTask = async (
    payload: CreateTaskPayload,
    taskId?: string,
  ) => {
    if (taskId) {
      const updated = await taskService.update(taskId, payload);
      if (detailTask?.id === taskId) {
        setDetailTask(updated);
      }
    } else {
      await taskService.create(payload);
    }
    await loadTasks();
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
            <span className="font-mono tabular-nums">{total}</span>{" "}
            {total === 1 ? "task" : "tasks"} matching your current view
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingTask(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New task
        </Button>
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

          {/* Search input */}
          <div className="relative w-full md:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="task-search" className="sr-only">
              Search tasks
            </label>
            <input
              id="task-search"
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search tasks…"
              className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
            />
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

      {error && <ErrorBanner message={error} onRetry={loadTasks} />}

      {/* Task List */}
      {loading ? (
        <LoadingRows count={5} />
      ) : tasks.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? "No tasks match these filters" : "No tasks yet"}
          description={
            hasActiveFilters
              ? "Try broadening your search or clearing active filters."
              : "Add your first task with a clear outcome and due date to build momentum."
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : (
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
            )
          }
        />
      ) : (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {tasks.map((task) => {
            const completed = task.status === "COMPLETED";
            const overdue = isTaskOverdue(task.dueDate, task.status);
            const pStyle = PRIORITY_STYLES[task.priority];

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
                        {task.title}
                      </button>
                      {task.isImportant && (
                        <Star
                          className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500"
                          aria-label="Important"
                        />
                      )}
                    </div>

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
                      {task.tags.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {task.tags.map((t) => `#${t.name}`).join(" ")}
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
      />

      {/* Task Detail Modal */}
      <Modal
        open={Boolean(detailTask)}
        onClose={() => setDetailTask(null)}
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
