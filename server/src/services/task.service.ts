import { Errors } from "../lib/errors.js";
import {
  createTask,
  deleteTaskByIdAndUser,
  findTaskByIdAndUser,
  listTasksByUser,
  updateTaskByIdAndUser,
  type HydratedTask,
  type TaskPriority,
  type TaskStatus,
} from "../repositories/task.repository.js";
import {
  findCategoryByIdAndUser,
  findTagsByIdsAndUser,
} from "../repositories/taxonomy.repository.js";
import type {
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
} from "../validators/task.validator.js";

const STATUS_MAP: Record<string, TaskStatus> = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  Todo: "TODO",
  "In Progress": "IN_PROGRESS",
  Completed: "COMPLETED",
};

const PRIORITY_MAP: Record<string, TaskPriority> = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
};

function normalizeDateInput(
  value: string | Date | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  // Date-only string YYYY-MM-DD -> noon UTC to avoid off-by-one timezone shifts
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  return new Date(value);
}

function getDayBoundsUtc(reference = new Date()): {
  startOfToday: Date;
  endOfToday: Date;
} {
  const startOfToday = new Date(reference);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(reference);
  endOfToday.setUTCHours(23, 59, 59, 999);
  return { startOfToday, endOfToday };
}

async function validateOwnershipForRelations(
  userId: string,
  categoryId?: string | null,
  tagIds?: string[],
): Promise<void> {
  if (categoryId) {
    const category = await findCategoryByIdAndUser(categoryId, userId);
    if (!category) {
      throw Errors.badRequest("Selected category was not found");
    }
  }

  if (tagIds && tagIds.length > 0) {
    const uniqueIds = Array.from(new Set(tagIds));
    const ownedTags = await findTagsByIdsAndUser(uniqueIds, userId);
    if (ownedTags.length !== uniqueIds.length) {
      throw Errors.badRequest("One or more selected tags were not found");
    }
  }
}

export const createTaskService = async (
  data: CreateTaskInput,
  userId: string,
): Promise<HydratedTask> => {
  await validateOwnershipForRelations(userId, data.categoryId, data.tagIds);

  const normalizedStatus = STATUS_MAP[data.status ?? "TODO"] ?? "TODO";
  const normalizedPriority = PRIORITY_MAP[data.priority ?? "MEDIUM"] ?? "MEDIUM";

  return createTask({
    userId,
    title: data.title,
    description: data.description ?? null,
    status: normalizedStatus,
    priority: normalizedPriority,
    categoryId: data.categoryId ?? null,
    dueDate: normalizeDateInput(data.dueDate) ?? null,
    reminderTime: normalizeDateInput(data.reminderTime) ?? null,
    completedAt: normalizedStatus === "COMPLETED" ? new Date() : null,
    estimatedMinutes: data.estimatedMinutes ?? null,
    isImportant: data.isImportant ?? false,
    tagIds: data.tagIds ?? [],
  });
};

export const listTasksService = async (
  userId: string,
  query: ListTasksQuery,
) => {
  const { startOfToday, endOfToday } = getDayBoundsUtc();
  const { items, total } = await listTasksByUser({
    userId,
    status: query.status,
    priority: query.priority,
    categoryId: query.categoryId,
    tagId: query.tagId,
    dueFilter: query.dueFilter,
    search: query.search,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    page: query.page,
    limit: query.limit,
    startOfToday,
    endOfToday,
  });

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
};

export const getTaskByIdService = async (
  taskId: string,
  userId: string,
): Promise<HydratedTask> => {
  const task = await findTaskByIdAndUser(taskId, userId);
  if (!task) {
    throw Errors.notFound("Task not found");
  }
  return task;
};

export const updateTaskService = async (
  taskId: string,
  userId: string,
  data: UpdateTaskInput,
): Promise<HydratedTask> => {
  const existing = await findTaskByIdAndUser(taskId, userId);
  if (!existing) {
    throw Errors.notFound("Task not found");
  }

  await validateOwnershipForRelations(userId, data.categoryId, data.tagIds);

  const nextStatus =
    data.status !== undefined ? STATUS_MAP[data.status] : undefined;
  const nextPriority =
    data.priority !== undefined ? PRIORITY_MAP[data.priority] : undefined;

  let completedAt: Date | null | undefined = undefined;
  if (nextStatus === "COMPLETED" && existing.status !== "COMPLETED") {
    completedAt = new Date();
  } else if (nextStatus && nextStatus !== "COMPLETED") {
    completedAt = null;
  }

  const updated = await updateTaskByIdAndUser(taskId, userId, {
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.description !== undefined
      ? { description: data.description }
      : {}),
    ...(nextStatus !== undefined ? { status: nextStatus } : {}),
    ...(nextPriority !== undefined ? { priority: nextPriority } : {}),
    ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
    ...(data.dueDate !== undefined
      ? { dueDate: normalizeDateInput(data.dueDate) }
      : {}),
    ...(data.reminderTime !== undefined
      ? { reminderTime: normalizeDateInput(data.reminderTime) }
      : {}),
    ...(completedAt !== undefined ? { completedAt } : {}),
    ...(data.estimatedMinutes !== undefined
      ? { estimatedMinutes: data.estimatedMinutes }
      : {}),
    ...(data.isImportant !== undefined
      ? { isImportant: data.isImportant }
      : {}),
    ...(data.tagIds !== undefined ? { tagIds: data.tagIds } : {}),
  });

  if (!updated) {
    throw Errors.notFound("Task not found");
  }
  return updated;
};

export const toggleTaskCompleteService = async (
  taskId: string,
  userId: string,
): Promise<HydratedTask> => {
  const existing = await findTaskByIdAndUser(taskId, userId);
  if (!existing) {
    throw Errors.notFound("Task not found");
  }

  const isCurrentlyCompleted = existing.status === "COMPLETED";
  const updated = await updateTaskByIdAndUser(taskId, userId, {
    status: isCurrentlyCompleted ? "TODO" : "COMPLETED",
    completedAt: isCurrentlyCompleted ? null : new Date(),
  });

  if (!updated) {
    throw Errors.notFound("Task not found");
  }
  return updated;
};

export const deleteTaskService = async (
  taskId: string,
  userId: string,
): Promise<void> => {
  const deleted = await deleteTaskByIdAndUser(taskId, userId);
  if (!deleted) {
    throw Errors.notFound("Task not found");
  }
};
