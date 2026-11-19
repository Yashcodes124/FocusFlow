import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name must be 80 characters or fewer"),
    email: z.string().trim().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name is too long"),
  timezone: z.string().trim().min(1, "Timezone is required"),
  theme: z.enum(["light", "dark"]),
  focusDurationMinutes: z.coerce.number().int().min(5).max(120),
  shortBreakMinutes: z.coerce.number().int().min(1).max(30),
  longBreakMinutes: z.coerce.number().int().min(5).max(60),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type ProfileFormValues = z.infer<typeof profileFormSchema>;
