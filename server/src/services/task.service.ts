import {
  createTask as createTaskInRepository,
  type TaskPriority,
  type TaskStatus,
} from "../repositories/task.repository.js";
import {
  createTaskSchema,
  type CreateTaskInput,
} from "../validators/task.validator.js";

const STATUS_MAP: Record<CreateTaskInput["status"], TaskStatus> = {
  Todo: "TODO",
  "In Progress": "IN_PROGRESS",
  Completed: "COMPLETED",
};

const PRIORITY_MAP: Record<CreateTaskInput["priority"], TaskPriority> = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
};

export const createTaskService = async (
  data: CreateTaskInput,
  userId: string,
) => {
  const validatedData = createTaskSchema.parse(data);

  const normalizedData = {
    userId,
    title: validatedData.title,
    status: STATUS_MAP[validatedData.status ?? "Todo"],
    priority: PRIORITY_MAP[validatedData.priority ?? "Low"],
    isImportant: validatedData.isImportant ?? false,
    tagIds: validatedData.tagIds ?? [],
    ...(validatedData.description
      ? { description: validatedData.description }
      : {}),
    ...(validatedData.categoryId
      ? { categoryId: validatedData.categoryId }
      : {}),
    ...(validatedData.dueDate !== undefined
      ? {
          dueDate: validatedData.dueDate
            ? new Date(validatedData.dueDate)
            : null,
        }
      : {}),
    ...(validatedData.reminderTime !== undefined
      ? {
          reminderTime: validatedData.reminderTime
            ? new Date(validatedData.reminderTime)
            : null,
        }
      : {}),
    ...(validatedData.completedAt !== undefined
      ? {
          completedAt: validatedData.completedAt
            ? new Date(validatedData.completedAt)
            : null,
        }
      : {}),
    ...(validatedData.estimatedMinutes !== undefined
      ? { estimatedMinutes: validatedData.estimatedMinutes }
      : {}),
    ...(validatedData.color ? { color: validatedData.color } : {}),
  };

  return createTaskInRepository(normalizedData);
};
