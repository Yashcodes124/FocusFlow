import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import {
  categories,
  tags,
  tasks,
  taskTags,
} from "../../../src/db/schema.js";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type TaskRow = typeof tasks.$inferSelect;

export interface HydratedTask extends TaskRow {
  category: { id: string; name: string; color: string } | null;
  tags: Array<{ id: string; name: string; color: string }>;
}

export interface CreateTaskRepoData {
  userId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId?: string | null;
  dueDate?: Date | null;
  reminderTime?: Date | null;
  completedAt?: Date | null;
  estimatedMinutes?: number | null;
  isImportant: boolean;
  tagIds: string[];
}

export interface UpdateTaskRepoData {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  categoryId?: string | null;
  dueDate?: Date | null;
  reminderTime?: Date | null;
  completedAt?: Date | null;
  estimatedMinutes?: number | null;
  isImportant?: boolean;
  tagIds?: string[];
}

export interface ListTasksRepoParams {
  userId: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  categoryId?: string;
  tagId?: string;
  dueFilter?: "all" | "today" | "overdue" | "upcoming" | "no_date";
  search?: string;
  sortBy: "createdAt" | "dueDate" | "priority" | "updatedAt" | "title";
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
  startOfToday: Date;
  endOfToday: Date;
}

type DbExecutor = Pick<typeof db, "select">;

async function hydrateTasks(
  rows: TaskRow[],
  executor: DbExecutor = db,
): Promise<HydratedTask[]> {
  if (rows.length === 0) return [];

  const taskIds = rows.map((r) => r.id);
  const categoryIds = Array.from(
    new Set(rows.map((r) => r.categoryId).filter((v): v is string => Boolean(v))),
  );

  const [categoryRows, tagJoinRows] = await Promise.all([
    categoryIds.length > 0
      ? executor
          .select({
            id: categories.id,
            name: categories.name,
            color: categories.color,
          })
          .from(categories)
          .where(inArray(categories.id, categoryIds))
      : Promise.resolve([]),
    executor
      .select({
        taskId: taskTags.taskId,
        id: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(inArray(taskTags.taskId, taskIds)),
  ]);

  const categoryMap = new Map(categoryRows.map((c) => [c.id, c]));
  const tagsByTask = new Map<
    string,
    Array<{ id: string; name: string; color: string }>
  >();

  for (const row of tagJoinRows) {
    const list = tagsByTask.get(row.taskId) ?? [];
    list.push({ id: row.id, name: row.name, color: row.color });
    tagsByTask.set(row.taskId, list);
  }

  return rows.map((row) => ({
    ...row,
    category: row.categoryId ? (categoryMap.get(row.categoryId) ?? null) : null,
    tags: tagsByTask.get(row.id) ?? [],
  }));
}

export const createTask = async (
  data: CreateTaskRepoData,
): Promise<HydratedTask> => {
  const { tagIds, ...taskValues } = data;
  const inserted = await db.insert(tasks).values(taskValues).returning();
  const created = inserted[0]!;

  if (tagIds.length > 0) {
    const uniqueTagIds = Array.from(new Set(tagIds));
    await db
      .insert(taskTags)
      .values(uniqueTagIds.map((tagId) => ({ taskId: created.id, tagId })))
      .onConflictDoNothing();
  }

  const hydrated = await hydrateTasks([created]);
  return hydrated[0]!;
};

export const createTasksBulkInTransaction = async (
  items: CreateTaskRepoData[],
): Promise<HydratedTask[]> => {
  if (items.length === 0) return [];

  return db.transaction(async (tx) => {
    const insertedRows: TaskRow[] = [];
    const tagLinks: Array<{ taskId: string; tagId: string }> = [];

    for (const item of items) {
      const { tagIds, ...taskValues } = item;
      const inserted = await tx.insert(tasks).values(taskValues).returning();
      const created = inserted[0]!;
      insertedRows.push(created);

      if (tagIds.length > 0) {
        const uniqueTagIds = Array.from(new Set(tagIds));
        for (const tagId of uniqueTagIds) {
          tagLinks.push({ taskId: created.id, tagId });
        }
      }
    }

    if (tagLinks.length > 0) {
      await tx.insert(taskTags).values(tagLinks).onConflictDoNothing();
    }

    return hydrateTasks(insertedRows, tx);
  });
};

export const countPendingTasksByUser = async (
  userId: string,
): Promise<number> => {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), ne(tasks.status, "COMPLETED")));
  return result[0]?.count ?? 0;
};

export const findTaskByIdAndUser = async (
  id: string,
  userId: string,
): Promise<HydratedTask | null> => {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1);

  if (!rows[0]) return null;
  const hydrated = await hydrateTasks(rows);
  return hydrated[0] ?? null;
};

export const listTasksByUser = async (
  params: ListTasksRepoParams,
): Promise<{ items: HydratedTask[]; total: number }> => {
  const conditions: SQL[] = [eq(tasks.userId, params.userId)];

  if (params.status) {
    conditions.push(eq(tasks.status, params.status));
  }
  if (params.priority) {
    conditions.push(eq(tasks.priority, params.priority));
  }
  if (params.categoryId) {
    conditions.push(eq(tasks.categoryId, params.categoryId));
  }
  if (params.search && params.search.trim().length > 0) {
    const tokens = params.search
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .slice(0, 8);

    for (const token of tokens) {
      const escaped = token.replace(/[\\%_]/g, "\\$&");
      const pattern = `%${escaped}%`;
      conditions.push(
        or(
          sql`${tasks.title} ILIKE ${pattern} ESCAPE '\\'`,
          sql`${tasks.description} ILIKE ${pattern} ESCAPE '\\'`,
        )!,
      );
    }
  }

  if (params.dueFilter === "today") {
    conditions.push(
      and(
        gte(tasks.dueDate, params.startOfToday),
        lte(tasks.dueDate, params.endOfToday),
      )!,
    );
  } else if (params.dueFilter === "overdue") {
    conditions.push(
      and(
        lt(tasks.dueDate, params.startOfToday),
        ne(tasks.status, "COMPLETED"),
      )!,
    );
  } else if (params.dueFilter === "upcoming") {
    conditions.push(
      and(
        gte(tasks.dueDate, params.endOfToday),
        ne(tasks.status, "COMPLETED"),
      )!,
    );
  } else if (params.dueFilter === "no_date") {
    conditions.push(isNull(tasks.dueDate));
  }

  if (params.tagId) {
    const matchingTaskIds = await db
      .select({ taskId: taskTags.taskId })
      .from(taskTags)
      .where(eq(taskTags.tagId, params.tagId));
    const ids = matchingTaskIds.map((r) => r.taskId);
    if (ids.length === 0) {
      return { items: [], total: 0 };
    }
    conditions.push(inArray(tasks.id, ids));
  }

  const whereClause = and(...conditions);

  const priorityOrderExpr = sql<number>`CASE ${tasks.priority} WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END`;
  const orderCol =
    params.sortBy === "dueDate"
      ? tasks.dueDate
      : params.sortBy === "priority"
        ? priorityOrderExpr
        : params.sortBy === "updatedAt"
          ? tasks.updatedAt
          : params.sortBy === "title"
            ? tasks.title
            : tasks.createdAt;

  const orderExpr =
    params.sortOrder === "asc" ? asc(orderCol) : desc(orderCol);

  const offset = (params.page - 1) * params.limit;

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(whereClause),
    db
      .select()
      .from(tasks)
      .where(whereClause)
      .orderBy(orderExpr, desc(tasks.createdAt))
      .limit(params.limit)
      .offset(offset),
  ]);

  const items = await hydrateTasks(rows);
  return {
    items,
    total: countResult[0]?.count ?? 0,
  };
};

export const updateTaskByIdAndUser = async (
  id: string,
  userId: string,
  data: UpdateTaskRepoData,
): Promise<HydratedTask | null> => {
  const { tagIds, ...taskFields } = data;

  const updatedRows = await db
    .update(tasks)
    .set({
      ...taskFields,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();

  const updated = updatedRows[0];
  if (!updated) return null;

  if (tagIds !== undefined) {
    await db.delete(taskTags).where(eq(taskTags.taskId, id));
    const uniqueTagIds = Array.from(new Set(tagIds));
    if (uniqueTagIds.length > 0) {
      await db
        .insert(taskTags)
        .values(uniqueTagIds.map((tagId) => ({ taskId: id, tagId })))
        .onConflictDoNothing();
    }
  }

  const hydrated = await hydrateTasks([updated]);
  return hydrated[0] ?? null;
};

export const deleteTaskByIdAndUser = async (
  id: string,
  userId: string,
): Promise<boolean> => {
  const rows = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });
  return rows.length > 0;
};
