import { z } from "zod";

const dateValueSchema = z
  .union([z.string().datetime(), z.date(), z.null()])
  .optional();

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title is too long"),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional()
    .or(z.literal("")),
  status: z
    .enum(["Todo", "In Progress", "Completed"])
    .optional()
    .default("Todo"),
  priority: z.enum(["Low", "Medium", "High"]).optional().default("Low"),
  categoryId: z.string().trim().min(1).optional(),
  dueDate: dateValueSchema,
  reminderTime: dateValueSchema,
  completedAt: dateValueSchema,
  estimatedMinutes: z.number().int().positive().optional(),
  color: z.string().trim().max(30).optional(),
  isImportant: z.boolean().optional().default(false),
  tagIds: z.array(z.string().trim().min(1)).optional().default([]),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
