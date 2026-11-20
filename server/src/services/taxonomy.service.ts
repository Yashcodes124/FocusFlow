import { Errors } from "../lib/errors.js";
import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  listCategoriesByUser,
  listTagsByUser,
  updateCategory,
  updateTag,
} from "../repositories/taxonomy.repository.js";
import type {
  CreateCategoryInput,
  CreateTagInput,
  UpdateCategoryInput,
  UpdateTagInput,
} from "../validators/taxonomy.validator.js";

export const listCategoriesService = (userId: string) =>
  listCategoriesByUser(userId);

export const createCategoryService = (
  userId: string,
  data: CreateCategoryInput,
) =>
  createCategory(userId, {
    name: data.name,
    color: data.color ?? "#2563EB",
  });

export const updateCategoryService = async (
  id: string,
  userId: string,
  data: UpdateCategoryInput,
) => {
  const updated = await updateCategory(id, userId, data);
  if (!updated) throw Errors.notFound("Category not found");
  return updated;
};

export const deleteCategoryService = async (id: string, userId: string) => {
  const deleted = await deleteCategory(id, userId);
  if (!deleted) throw Errors.notFound("Category not found");
};

export const listTagsService = (userId: string) => listTagsByUser(userId);

export const createTagService = (userId: string, data: CreateTagInput) =>
  createTag(userId, {
    name: data.name,
    color: data.color ?? "#475569",
  });

export const updateTagService = async (
  id: string,
  userId: string,
  data: UpdateTagInput,
) => {
  const updated = await updateTag(id, userId, data);
  if (!updated) throw Errors.notFound("Tag not found");
  return updated;
};

export const deleteTagService = async (id: string, userId: string) => {
  const deleted = await deleteTag(id, userId);
  if (!deleted) throw Errors.notFound("Tag not found");
};
