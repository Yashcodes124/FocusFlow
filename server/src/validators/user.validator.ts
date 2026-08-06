//it contains only schemas : but no express, no prisma, no bcrypt

//just VALIDATION Rules

import { z } from "zod";

//schema for User Registration
export const registerUserSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .min(3, "Name must be atleast 3 chracters long"),

  email: z.string({ error: "Email is required" }).email("Invalid email format"),

  password: z
    .string({ error: "Password is required" })
    .min(6, "Password must be at least 6 characters long"),
});

//typeSafety: Infer TypeScript type directly from the schema for use in controllers/services
export type CreateUserInput = z.infer<typeof registerUserSchema>;

export const loginUserSchema = z.object({
  email: z
    .string({ error: "Please enter a valid email" })
    .email("Invalid email format"),

  password: z
    .string({ error: "invalid password" })
    .min(6, "Password must be at least 6 characters long"),
});
