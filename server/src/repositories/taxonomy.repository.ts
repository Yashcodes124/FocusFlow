import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import { categories, tags } from "../../../src/db/schema.js";

export type CategoryRow = typeof categories.$inferSelect;
export type TagRow = typeof tags.$inferSelect;

// Categories
export const listCategoriesByUser = async (
  userId: string,
): Promise<CategoryRow[]> => {
  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.name));
};

export const findCategoryByIdAndUser = async (
  id: string,
  userId: string,
): Promise<CategoryRow | null> => {
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
};

export const createCategory = async (
  userId: string,
  data: { name: string; color: string },
): Promise<CategoryRow> => {
  const rows = await db
    .insert(categories)
    .values({
      userId,
      name: data.name,
      color: data.color,
    })
    .returning();
  return rows[0]!;
};

export const updateCategory = async (
  id: string,
  userId: string,
  data: { name?: string; color?: string },
): Promise<CategoryRow | null> => {
  const rows = await db
    .update(categories)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();
  return rows[0] ?? null;
};

export const deleteCategory = async (
  id: string,
  userId: string,
): Promise<boolean> => {
  const rows = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning({ id: categories.id });
  return rows.length > 0;
};

// Tags
export const listTagsByUser = async (userId: string): Promise<TagRow[]> => {
  return db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name));
};

export const findTagsByIdsAndUser = async (
  ids: string[],
  userId: string,
): Promise<TagRow[]> => {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, ids)));
};

export const createTag = async (
  userId: string,
  data: { name: string; color: string },
): Promise<TagRow> => {
  const rows = await db
    .insert(tags)
    .values({
      userId,
      name: data.name,
      color: data.color,
    })
    .returning();
  return rows[0]!;
};

export const updateTag = async (
  id: string,
  userId: string,
  data: { name?: string; color?: string },
): Promise<TagRow | null> => {
  const rows = await db
    .update(tags)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(tags.id, id), eq(tags.userId, userId)))
    .returning();
  return rows[0] ?? null;
};

export const deleteTag = async (
  id: string,
  userId: string,
): Promise<boolean> => {
  const rows = await db
    .delete(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)))
    .returning({ id: tags.id });
  return rows.length > 0;
};

export const listRecentCategories = async (userId: string) => {
  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(desc(categories.createdAt));
};
