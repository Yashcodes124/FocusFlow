import { apiClient } from "../../../lib/api";
import type {
  AiDecomposeRequest,
  AiDecomposeResponse,
  Category,
  CreateTaskPayload,
  Tag,
  Task,
  TaskAttachment,
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
  async list(
    filters: TaskListFilters = {},
    signal?: AbortSignal,
  ): Promise<PaginatedTasksResult> {
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
    }>("/tasks", { params, signal });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  async create(payload: CreateTaskPayload): Promise<Task> {
    const res = await apiClient.post<{ success: true; data: Task }>(
      "/tasks",
      payload,
    );
    return res.data.data;
  },

  async createBulk(tasks: CreateTaskPayload[]): Promise<Task[]> {
    const res = await apiClient.post<{ success: true; data: Task[] }>(
      "/tasks/bulk",
      { tasks },
    );
    return res.data.data;
  },

  async decomposeGoal(
    payload: AiDecomposeRequest,
  ): Promise<AiDecomposeResponse> {
    const res = await apiClient.post<{
      success: true;
      data: AiDecomposeResponse;
    }>("/ai/decompose-task", payload, { timeout: 45000 });
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

  async uploadAttachment(
    taskId: string,
    payload: { fileName: string; mimeType: string; dataBase64: string },
  ): Promise<TaskAttachment> {
    const res = await apiClient.post<{ success: true; data: TaskAttachment }>(
      `/tasks/${taskId}/attachments`,
      payload,
    );
    return res.data.data;
  },

  async downloadAttachment(taskId: string, attachmentId: string): Promise<Blob> {
    const res = await apiClient.get<Blob>(
      `/tasks/${taskId}/attachments/${attachmentId}/download`,
      { responseType: "blob" },
    );
    return res.data;
  },

  async deleteAttachment(taskId: string, attachmentId: string): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
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
