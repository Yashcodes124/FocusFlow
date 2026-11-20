import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid ID format");

const nullableDateSchema = z
  .union([
    z.string().datetime({ offset: true }),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.date(),
    z.null(),
  ])
  .optional();

const statusInputSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
  "Todo",
  "In Progress",
  "Completed",
]);

const priorityInputSchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "Low",
  "Medium",
  "High",
]);

export const createTaskSchema = z.object({
  title: z
    .string({ error: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .max(140, "Title must be 140 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional()
    .nullable(),
  status: statusInputSchema.optional().default("TODO"),
  priority: priorityInputSchema.optional().default("MEDIUM"),
  categoryId: uuidSchema.optional().nullable(),
  dueDate: nullableDateSchema,
  reminderTime: nullableDateSchema,
  estimatedMinutes: z.number().int().min(1).max(1440).optional().nullable(),
  isImportant: z.boolean().optional().default(false),
  tagIds: z.array(uuidSchema).max(20).optional().default([]),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(140, "Title must be 140 characters or fewer")
    .optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  status: statusInputSchema.optional(),
  priority: priorityInputSchema.optional(),
  categoryId: uuidSchema.optional().nullable(),
  dueDate: nullableDateSchema,
  reminderTime: nullableDateSchema,
  estimatedMinutes: z.number().int().min(1).max(1440).optional().nullable(),
  isImportant: z.boolean().optional(),
  tagIds: z.array(uuidSchema).max(20).optional(),
});

export const listTasksQuerySchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  categoryId: uuidSchema.optional(),
  tagId: uuidSchema.optional(),
  dueFilter: z
    .enum(["all", "today", "overdue", "upcoming", "no_date"])
    .optional()
    .default("all"),
  search: z.string().trim().max(120).optional(),
  sortBy: z
    .enum(["createdAt", "dueDate", "priority", "updatedAt", "title"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  timezone: z.string().trim().max(64).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
