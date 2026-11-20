# Database

FocusFlow persists all application data in **PostgreSQL** (Cloud SQL) using **Drizzle ORM** and `pg.Pool`.

- Schema definition: `src/db/schema.ts`
- Runtime pool & Drizzle client: `src/db/index.ts`
- Migration configuration: `src/db/drizzle.config.ts`

## Connection Configuration

FocusFlow supports two PostgreSQL connection modes automatically (`src/db/index.ts` and `src/db/drizzle.config.ts`):

1. **Cloud SQL discrete credentials** (used automatically when `SQL_HOST`, `SQL_DB_NAME`, and `SQL_USER` are set):
   - Runtime: `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD` (optional `SQL_PORT`)
   - Migrations: `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`
2. **Standard PostgreSQL or Supabase connection URL** (used automatically for local PostgreSQL, Supabase, Neon, or Render):
   - `DATABASE_URL`: Standard PostgreSQL connection URI (for Supabase, use the Transaction Pooler URI; SSL is enabled automatically for remote hosts and disabled for `localhost`/`127.0.0.1`).
   - `DIRECT_URL` (optional): Direct non-pooled URI used by `npm run db:push` (recommended for Supabase schema pushes).

The runtime pool (`pg.Pool`) is initialized lazily and cached globally to avoid connection exhaustion during server restarts.

To push the schema to your database locally:

```bash
npm run db:push
```

## Relational Schema (`src/db/schema.ts`)

| Table | Purpose | Key Relationships & Constraints |
| --- | --- | --- |
| `users` | Account identity, bcrypt hash (nullable for OAuth-only users), `firebase_uid`, `token_version`, preferences (`theme`, `timezone`, Pomodoro defaults) | Unique `email` and `firebase_uid`; cascades delete to all owned records |
| `categories` | User-owned task groupings with color token | Belongs to `users`; unique `(user_id, name)` |
| `tags` | User-owned task labels with color token | Belongs to `users`; unique `(user_id, name)` |
| `tasks` | Actionable work (`status`, `priority`, `due_date`, `estimated_minutes`, `completed_at`) | Belongs to `users`; optional `category_id` (`ON DELETE SET NULL`); composite index `(user_id, status, due_date)` |
| `task_tags` | Explicit many-to-many join table between `tasks` and `tags` | Composite primary key `(task_id, tag_id)`; cascades delete from either side |
| `habits` | Repeating routines (`frequency`, `target_per_period`, `current_streak`, `best_streak`, `archived`) | Belongs to `users`; cascades delete to `habit_completions` |
| `habit_completions` | Timezone-normalized daily check-in logs (`completed_date` as `YYYY-MM-DD`) | Belongs to `habits` and `users`; unique `(habit_id, completed_date)` |
| `focus_sessions` | Persisted Pomodoro / deep-work and break sessions (`type`, `status`, `planned_minutes`, `actual_minutes`, timestamps) | Belongs to `users`; optional `task_id` (`ON DELETE SET NULL`) |
| `notes` | Structured workspace notes (`title`, `content`, `pinned`) | Belongs to `users`; indexed by `(user_id, pinned, updated_at)` |
| `notifications` | User reminders with optional links to a task or habit | Belongs to `users`; optional `task_id`/`habit_id` (`ON DELETE SET NULL`) |

## PostgreSQL Enums

- `task_status`: `TODO`, `IN_PROGRESS`, `DONE`
- `task_priority`: `LOW`, `MEDIUM`, `HIGH`
- `habit_frequency`: `DAILY`, `WEEKLY`
- `focus_session_type`: `FOCUS`, `SHORT_BREAK`, `LONG_BREAK`
- `focus_session_status`: `IN_PROGRESS`, `COMPLETED`, `INTERRUPTED`
- `theme_preference`: `LIGHT`, `DARK`
- `notification_type`: `TASK_DUE`, `HABIT_REMINDER`, `FOCUS_COMPLETE`, `SYSTEM`

## Legacy Note

Earlier commits included a `server/prisma/` folder that was disconnected from a live database and used an in-memory mock repository. All active repositories now query Cloud SQL PostgreSQL directly via `src/db/index.ts` and `src/db/schema.ts`.
