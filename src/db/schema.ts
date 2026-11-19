import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const priorityEnum = pgEnum("priority", ["LOW", "MEDIUM", "HIGH"]);
export const taskStatusEnum = pgEnum("task_status", [
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
]);
export const habitFrequencyEnum = pgEnum("habit_frequency", [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
]);
export const focusSessionTypeEnum = pgEnum("focus_session_type", [
  "FOCUS",
  "SHORT_BREAK",
  "LONG_BREAK",
]);
export const focusSessionStatusEnum = pgEnum("focus_session_status", [
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "TASK",
  "HABIT",
  "REMINDER",
  "SYSTEM",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firebaseUid: text("firebase_uid").unique(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash"),
    theme: text("theme").notNull().default("light"),
    language: text("language").notNull().default("en"),
    timezone: text("timezone").notNull().default("UTC"),
    focusDurationMinutes: integer("focus_duration_minutes").notNull().default(25),
    shortBreakMinutes: integer("short_break_minutes").notNull().default(5),
    longBreakMinutes: integer("long_break_minutes").notNull().default(15),
    tokenVersion: integer("token_version").notNull().default(0),
    isEmailVerified: boolean("is_email_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    uniqueIndex("users_firebase_uid_idx").on(table.firebaseUid),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#2563EB"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("categories_user_id_idx").on(table.userId),
    uniqueIndex("categories_user_name_idx").on(table.userId, table.name),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#475569"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tags_user_id_idx").on(table.userId),
    uniqueIndex("tags_user_name_idx").on(table.userId, table.name),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    priority: priorityEnum("priority").notNull().default("MEDIUM"),
    status: taskStatusEnum("status").notNull().default("TODO"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    reminderTime: timestamp("reminder_time", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    estimatedMinutes: integer("estimated_minutes"),
    isImportant: boolean("is_important").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tasks_user_status_idx").on(table.userId, table.status),
    index("tasks_user_due_date_idx").on(table.userId, table.dueDate),
    index("tasks_user_priority_idx").on(table.userId, table.priority),
    index("tasks_user_category_idx").on(table.userId, table.categoryId),
  ],
);

export const taskTags = pgTable(
  "task_tags",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.tagId] }),
    index("task_tags_tag_id_idx").on(table.tagId),
  ],
);

export const habits = pgTable(
  "habits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    frequency: habitFrequencyEnum("frequency").notNull().default("DAILY"),
    target: integer("target").notNull().default(1),
    currentStreak: integer("current_streak").notNull().default(0),
    bestStreak: integer("best_streak").notNull().default(0),
    lastCompletedDate: text("last_completed_date"),
    color: text("color").notNull().default("#2563EB"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("habits_user_id_idx").on(table.userId)],
);

export const habitCompletions = pgTable(
  "habit_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    completedDate: text("completed_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("habit_completions_habit_date_idx").on(
      table.habitId,
      table.completedDate,
    ),
    index("habit_completions_user_date_idx").on(
      table.userId,
      table.completedDate,
    ),
  ],
);

export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    sessionType: focusSessionTypeEnum("session_type")
      .notNull()
      .default("FOCUS"),
    status: focusSessionStatusEnum("status").notNull().default("IN_PROGRESS"),
    plannedMinutes: integer("planned_minutes").notNull().default(25),
    actualSeconds: integer("actual_seconds").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("focus_sessions_user_started_idx").on(table.userId, table.startedAt),
    index("focus_sessions_user_status_idx").on(table.userId, table.status),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notes_user_updated_idx").on(table.userId, table.updatedAt),
    index("notes_user_pinned_idx").on(table.userId, table.isPinned),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    habitId: uuid("habit_id").references(() => habits.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: notificationTypeEnum("type").notNull().default("SYSTEM"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("notifications_user_read_idx").on(table.userId, table.isRead)],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  tags: many(tags),
  tasks: many(tasks),
  habits: many(habits),
  habitCompletions: many(habitCompletions),
  focusSessions: many(focusSessions),
  notes: many(notes),
  notifications: many(notifications),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  tasks: many(tasks),
  notes: many(notes),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  taskTags: many(taskTags),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  category: one(categories, {
    fields: [tasks.categoryId],
    references: [categories.id],
  }),
  taskTags: many(taskTags),
  focusSessions: many(focusSessions),
  notifications: many(notifications),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, { fields: [habits.userId], references: [users.id] }),
  completions: many(habitCompletions),
  notifications: many(notifications),
}));

export const habitCompletionsRelations = relations(
  habitCompletions,
  ({ one }) => ({
    habit: one(habits, {
      fields: [habitCompletions.habitId],
      references: [habits.id],
    }),
    user: one(users, {
      fields: [habitCompletions.userId],
      references: [users.id],
    }),
  }),
);

export const focusSessionsRelations = relations(focusSessions, ({ one }) => ({
  user: one(users, { fields: [focusSessions.userId], references: [users.id] }),
  task: one(tasks, { fields: [focusSessions.taskId], references: [tasks.id] }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, { fields: [notes.userId], references: [users.id] }),
  category: one(categories, {
    fields: [notes.categoryId],
    references: [categories.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  task: one(tasks, { fields: [notifications.taskId], references: [tasks.id] }),
  habit: one(habits, {
    fields: [notifications.habitId],
    references: [habits.id],
  }),
}));
