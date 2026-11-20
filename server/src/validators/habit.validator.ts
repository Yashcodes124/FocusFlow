import { z } from "zod";

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const createHabitSchema = z.object({
  name: z
    .string({ error: "Habit name is required" })
    .trim()
    .min(1, "Habit name is required")
    .max(100, "Habit name must be 100 characters or fewer"),
  description: z.string().trim().max(500).optional().nullable(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional().default("DAILY"),
  target: z.number().int().min(1).max(31).optional().default(1),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color hex")
    .optional()
    .default("#2563EB"),
});

export const updateHabitSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
  target: z.number().int().min(1).max(31).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color hex")
    .optional(),
});

export const checkInHabitSchema = z.object({
  date: dateKeySchema.optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  completed: z.boolean().optional(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type CheckInHabitInput = z.infer<typeof checkInHabitSchema>;
