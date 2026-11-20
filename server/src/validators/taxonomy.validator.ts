import { z } from "zod";

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a 6-digit hex code");

export const createCategorySchema = z.object({
  name: z
    .string({ error: "Category name is required" })
    .trim()
    .min(1, "Category name is required")
    .max(50, "Category name must be 50 characters or fewer"),
  color: hexColorSchema.optional().default("#2563EB"),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  color: hexColorSchema.optional(),
});

export const createTagSchema = z.object({
  name: z
    .string({ error: "Tag name is required" })
    .trim()
    .min(1, "Tag name is required")
    .max(40, "Tag name must be 40 characters or fewer"),
  color: hexColorSchema.optional().default("#475569"),
});

export const updateTagSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  color: hexColorSchema.optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
