import { apiClient } from "../../../lib/api";
import type {
  Category,
  CreateTaskPayload,
  Tag,
  Task,
  TaskListFilters,
  UpdateTaskPayload,
} from "../types";

export interface PaginatedTasksResult {
  data: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const taskService = {
  async list(filters: TaskListFilters = {}): Promise<PaginatedTasksResult> {
    const params: Record<string, string | number> = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.categoryId) params.categoryId = filters.categoryId;
    if (filters.tagId) params.tagId = filters.tagId;
    if (filters.dueFilter && filters.dueFilter !== "all") {
      params.dueFilter = filters.dueFilter;
    }
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    const res = await apiClient.get<{
      success: true;
      data: Task[];
      pagination: PaginatedTasksResult["pagination"];
    }>("/tasks", { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  async create(payload: CreateTaskPayload): Promise<Task> {
    const res = await apiClient.post<{ success: true; data: Task }>(
      "/tasks",
      payload,
    );
    return res.data.data;
  },

  async update(id: string, payload: UpdateTaskPayload): Promise<Task> {
    const res = await apiClient.patch<{ success: true; data: Task }>(
      `/tasks/${id}`,
      payload,
    );
    return res.data.data;
  },

  async toggleComplete(id: string): Promise<Task> {
    const res = await apiClient.patch<{ success: true; data: Task }>(
      `/tasks/${id}/toggle`,
    );
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },

  async listCategories(): Promise<Category[]> {
    const res = await apiClient.get<{ success: true; data: Category[] }>(
      "/categories",
    );
    return res.data.data;
  },

  async createCategory(name: string, color: string): Promise<Category> {
    const res = await apiClient.post<{ success: true; data: Category }>(
      "/categories",
      { name, color },
    );
    return res.data.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },

  async listTags(): Promise<Tag[]> {
    const res = await apiClient.get<{ success: true; data: Tag[] }>("/tags");
    return res.data.data;
  },

  async createTag(name: string, color: string): Promise<Tag> {
    const res = await apiClient.post<{ success: true; data: Tag }>("/tags", {
      name,
      color,
    });
    return res.data.data;
  },

  async deleteTag(id: string): Promise<void> {
    await apiClient.delete(`/tags/${id}`);
  },
};
