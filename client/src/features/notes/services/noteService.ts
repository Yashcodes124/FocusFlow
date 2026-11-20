import { apiClient } from "../../../lib/api";
import type { Task } from "../../tasks/types";

export interface Note {
  id: string;
  userId: string;
  categoryId: string | null;
  category: { id: string; name: string; color: string } | null;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export const noteService = {
  async list(params?: { search?: string; categoryId?: string }): Promise<Note[]> {
    const res = await apiClient.get<{ success: true; data: Note[] }>("/notes", {
      params,
    });
    return res.data.data;
  },

  async create(payload: {
    title: string;
    content?: string;
    categoryId?: string | null;
    isPinned?: boolean;
  }): Promise<Note> {
    const res = await apiClient.post<{ success: true; data: Note }>(
      "/notes",
      payload,
    );
    return res.data.data;
  },

  async update(
    id: string,
    payload: {
      title?: string;
      content?: string;
      categoryId?: string | null;
      isPinned?: boolean;
    },
  ): Promise<Note> {
    const res = await apiClient.patch<{ success: true; data: Note }>(
      `/notes/${id}`,
      payload,
    );
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/notes/${id}`);
  },

  async extractTasks(
    id: string,
    payload?: { selectedTitles?: string[]; categoryId?: string | null },
  ): Promise<{ createdTasks: Task[]; extractedCount: number }> {
    const res = await apiClient.post<{
      success: true;
      data: { createdTasks: Task[]; extractedCount: number };
    }>(`/notes/${id}/extract-tasks`, payload ?? {});
    return res.data.data;
  },
};
