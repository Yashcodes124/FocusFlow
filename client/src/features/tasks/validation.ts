import { z } from "zod";

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required")
    .max(140, "Title must be 140 characters or fewer"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED"]),
  dueDate: z.string().optional(),
  categoryId: z.string().optional(),
  estimatedMinutes: z.string().optional(),
  isImportant: z.boolean().optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
