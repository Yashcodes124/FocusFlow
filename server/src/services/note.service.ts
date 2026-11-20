import { Errors } from "../lib/errors.js";
import {
  createNote,
  deleteNoteByIdAndUser,
  findNoteByIdAndUser,
  listNotesByUser,
  updateNoteByIdAndUser,
} from "../repositories/note.repository.js";
import { findCategoryByIdAndUser } from "../repositories/taxonomy.repository.js";
import { createTaskService } from "./task.service.js";
import { extractActionItemsFromNote } from "../utils/noteExtractor.js";
import type {
  CreateNoteInput,
  ExtractNoteTasksInput,
  UpdateNoteInput,
} from "../validators/note.validator.js";

export const listNotesService = (
  userId: string,
  options?: { search?: string; categoryId?: string },
) => listNotesByUser(userId, options);

export const getNoteByIdService = async (noteId: string, userId: string) => {
  const note = await findNoteByIdAndUser(noteId, userId);
  if (!note) throw Errors.notFound("Note not found");
  return note;
};

export const createNoteService = async (
  userId: string,
  data: CreateNoteInput,
) => {
  if (data.categoryId) {
    const cat = await findCategoryByIdAndUser(data.categoryId, userId);
    if (!cat) throw Errors.badRequest("Selected category was not found");
  }
  return createNote({
    userId,
    title: data.title,
    content: data.content ?? "",
    categoryId: data.categoryId ?? null,
    isPinned: data.isPinned ?? false,
  });
};

export const updateNoteService = async (
  noteId: string,
  userId: string,
  data: UpdateNoteInput,
) => {
  if (data.categoryId) {
    const cat = await findCategoryByIdAndUser(data.categoryId, userId);
    if (!cat) throw Errors.badRequest("Selected category was not found");
  }
  const updated = await updateNoteByIdAndUser(noteId, userId, data);
  if (!updated) throw Errors.notFound("Note not found");
  return updated;
};

export const deleteNoteService = async (noteId: string, userId: string) => {
  const deleted = await deleteNoteByIdAndUser(noteId, userId);
  if (!deleted) throw Errors.notFound("Note not found");
};

export const extractTasksFromNoteService = async (
  noteId: string,
  userId: string,
  input: ExtractNoteTasksInput,
) => {
  const note = await findNoteByIdAndUser(noteId, userId);
  if (!note) throw Errors.notFound("Note not found");

  const extracted = extractActionItemsFromNote(note.content);
  const candidates =
    input.selectedTitles && input.selectedTitles.length > 0
      ? input.selectedTitles.map((title) => {
          const matched = extracted.find(
            (e) => e.title.toLowerCase() === title.toLowerCase(),
          );
          return {
            title,
            priority: matched?.priority ?? ("MEDIUM" as const),
          };
        })
      : extracted;

  if (candidates.length === 0) {
    return { createdTasks: [], extractedCount: 0 };
  }

  const createdTasks = [];
  for (const item of candidates.slice(0, 20)) {
    const task = await createTaskService(
      {
        title: item.title,
        description: `Extracted from note: ${note.title}`,
        priority: item.priority,
        status: "TODO",
        categoryId: input.categoryId ?? note.categoryId ?? null,
        isImportant: item.priority === "HIGH",
        tagIds: [],
      },
      userId,
    );
    createdTasks.push(task);
  }

  return {
    createdTasks,
    extractedCount: createdTasks.length,
  };
};
