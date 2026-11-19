import { z } from "zod";

export const habitFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Habit name is required")
    .max(100, "Habit name must be 100 characters or fewer"),
  description: z.string().max(500, "Description is too long").optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  target: z.coerce.number().int().min(1, "Target must be at least 1").max(31),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Select a valid color"),
});

export type HabitFormValues = z.infer<typeof habitFormSchema>;
