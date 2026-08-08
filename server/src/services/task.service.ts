import { createTask as createTaskInRepository } from "../repositories/task.repository.js";
import {
  createTaskSchema,
  type CreateTaskInput,
} from "../validators/task.validator.js";

export const createTaskService = async (
  data: CreateTaskInput,
  userId: string,
) => {
  const validatedData = createTaskSchema.parse(data);

  const normalizedData = {
    userId,
    title: validatedData.title,
    status: validatedData.status ?? "Todo",
    priority: validatedData.priority ?? "Low",
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
