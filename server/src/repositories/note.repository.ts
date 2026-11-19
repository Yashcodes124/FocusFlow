import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import { categories, notes } from "../../../src/db/schema.js";

export type NoteRow = typeof notes.$inferSelect;

export interface HydratedNote extends NoteRow {
  category: { id: string; name: string; color: string } | null;
}

export const listNotesByUser = async (
  userId: string,
  options?: { search?: string; categoryId?: string },
): Promise<HydratedNote[]> => {
  const conditions: SQL[] = [eq(notes.userId, userId)];

  if (options?.categoryId) {
    conditions.push(eq(notes.categoryId, options.categoryId));
  }
  if (options?.search && options.search.trim().length > 0) {
    const pattern = `%${options.search.trim()}%`;
    conditions.push(
      or(ilike(notes.title, pattern), ilike(notes.content, pattern))!,
    );
  }

  const rows = await db
    .select({
      note: notes,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(notes)
    .leftJoin(categories, eq(notes.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt));

  return rows.map((r) => ({
    ...r.note,
    category:
      r.categoryId && r.categoryName && r.categoryColor
        ? { id: r.categoryId, name: r.categoryName, color: r.categoryColor }
        : null,
  }));
};

export const findNoteByIdAndUser = async (
  id: string,
  userId: string,
): Promise<HydratedNote | null> => {
  const rows = await db
    .select({
      note: notes,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(notes)
    .leftJoin(categories, eq(notes.categoryId, categories.id))
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    ...row.note,
    category:
      row.categoryId && row.categoryName && row.categoryColor
        ? {
            id: row.categoryId,
            name: row.categoryName,
            color: row.categoryColor,
          }
        : null,
  };
};

export const createNote = async (data: {
  userId: string;
  title: string;
  content: string;
  categoryId?: string | null;
  isPinned: boolean;
}): Promise<HydratedNote> => {
  const inserted = await db
    .insert(notes)
    .values({
      userId: data.userId,
      title: data.title,
      content: data.content,
      categoryId: data.categoryId ?? null,
      isPinned: data.isPinned,
    })
    .returning();

  const created = inserted[0]!;
  return (await findNoteByIdAndUser(created.id, data.userId))!;
};

export const updateNoteByIdAndUser = async (
  id: string,
  userId: string,
  data: {
    title?: string;
    content?: string;
    categoryId?: string | null;
    isPinned?: boolean;
  },
): Promise<HydratedNote | null> => {
  const updated = await db
    .update(notes)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning({ id: notes.id });

  if (!updated[0]) return null;
  return findNoteByIdAndUser(id, userId);
};

export const deleteNoteByIdAndUser = async (
  id: string,
  userId: string,
): Promise<boolean> => {
  const rows = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning({ id: notes.id });
  return rows.length > 0;
};
