import { randomUUID } from "node:crypto";

export type TaskStatus = "Todo" | "In Progress" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High";

export interface TaskRecord {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId?: string;
  dueDate?: Date | null;
  reminderTime?: Date | null;
  completedAt?: Date | null;
  estimatedMinutes?: number;
  color?: string;
  isImportant: boolean;
  tagIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const taskStore: TaskRecord[] = [];

export interface CreateTaskRepositoryData {
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId?: string;
  dueDate?: Date | null;
  reminderTime?: Date | null;
  completedAt?: Date | null;
  estimatedMinutes?: number;
  color?: string;
  isImportant: boolean;
  tagIds: string[];
}

export const createTask = async (
  data: CreateTaskRepositoryData,
): Promise<TaskRecord> => {
  const task: TaskRecord = {
    id: randomUUID(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  taskStore.push(task);
  return task;
};


