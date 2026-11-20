import { z } from "zod";

export const createNoteSchema = z.object({
  title: z
    .string({ error: "Note title is required" })
    .trim()
    .min(1, "Note title is required")
    .max(140, "Note title must be 140 characters or fewer"),
  content: z.string().max(25000, "Note is too long").optional().default(""),
  categoryId: z.string().uuid().optional().nullable(),
  isPinned: z.boolean().optional().default(false),
});

export const updateNoteSchema = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  content: z.string().max(25000).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  isPinned: z.boolean().optional(),
});

export const extractNoteTasksSchema = z.object({
  selectedTitles: z.array(z.string().trim().min(1).max(140)).optional(),
  categoryId: z.string().uuid().optional().nullable(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ExtractNoteTasksInput = z.infer<typeof extractNoteTasksSchema>;
