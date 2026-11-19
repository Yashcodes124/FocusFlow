export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";

export interface Category {
  id: string;
  userId?: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tag {
  id: string;
  userId?: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId: string | null;
  category: { id: string; name: string; color: string } | null;
  tags: Array<{ id: string; name: string; color: string }>;
  dueDate: string | null;
  reminderTime: string | null;
  completedAt: string | null;
  estimatedMinutes: number | null;
  isImportant: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListFilters {
  status?: TaskStatus | "";
  priority?: TaskPriority | "";
  categoryId?: string;
  tagId?: string;
  dueFilter?: "all" | "today" | "overdue" | "upcoming" | "no_date";
  search?: string;
  sortBy?: "createdAt" | "dueDate" | "priority" | "updatedAt" | "title";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  categoryId?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  isImportant?: boolean;
  tagIds?: string[];
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>;
