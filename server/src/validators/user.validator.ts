import { z } from "zod";

export const registerUserSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(80, "Name must be 80 characters or fewer"),
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Invalid email format"),
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password is too long"),
  timezone: z.string().trim().min(1).max(64).optional(),
});

export const loginUserSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Invalid email format"),
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required")
    .max(128, "Password is too long"),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(80, "Name must be 80 characters or fewer")
    .optional(),
  theme: z.enum(["light", "dark"]).optional(),
  language: z.enum(["en", "es", "fr", "de"]).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  focusDurationMinutes: z.number().int().min(5).max(120).optional(),
  shortBreakMinutes: z.number().int().min(1).max(30).optional(),
  longBreakMinutes: z.number().int().min(5).max(60).optional(),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
