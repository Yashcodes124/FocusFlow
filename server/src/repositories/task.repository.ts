import { randomUUID } from "node:crypto";
import prisma from "../lib/prisma.js";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

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

export const createTask = async (data: CreateTaskRepositoryData) => {
  return await prisma.task.create({
    data,
  });
};
