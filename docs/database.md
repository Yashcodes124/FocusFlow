# Database

Focus Flow uses PostgreSQL with Prisma 7 and the `@prisma/adapter-pg` adapter.
The Prisma schema is maintained at `server/prisma/schema.prisma`; migrations
are stored in `server/prisma/migrations/`.

## Connection and environment

The server reads `DATABASE_URL` from its environment. Project notes identify
Supabase as the intended hosted PostgreSQL provider, while the application
itself only requires a valid PostgreSQL connection string. Do not commit
credentials or real connection strings.

Create `server/.env` locally with values supplied by your database provider:

```dotenv
DATABASE_URL="<postgresql-connection-string>"
JWT_SECRET="<long-random-secret>"
```

Environment files are ignored by Git. Keep production values in the deployment
platform's secret manager.

## Data model

| Model | Role | Relationships |
| --- | --- | --- |
| `User` | Account identity, password hash, and basic preferences | Owns tasks, habits, categories, tags, and notifications |
| `Task` | Actionable work, status, priority, due dates, and focus metadata | Belongs to a user; optionally belongs to a category; can have tags and notifications |
| `Habit` | Repeating activity, target, and streak fields | Belongs to a user; can have notifications |
| `Category` | User-owned task grouping | Belongs to a user; can contain tasks |
| `Tag` | User-owned task label | Belongs to a user; has a many-to-many relationship with tasks |
| `Notification` | User notification with optional task or habit association | Belongs to a user; may reference a task or habit |

The schema defines enums for task status, task priority, habit frequency, and
notification type. User email is unique. Deleting a user cascades to
user-owned records; optional task/category and notification links use
`SET NULL` where configured.

## Prisma commands

Run these commands from the repository root:

```powershell
npm --prefix server run generate
npm --prefix server run migrate
```

`generate` builds the Prisma client according to the schema generator
configuration. `migrate` runs Prisma's development migration workflow and may
apply schema changes to the database configured by `DATABASE_URL`. Confirm the
target database and back up important data before running migrations against a
shared or production environment.

## Optional local PostgreSQL

The database may also be run locally. If PostgreSQL is installed as a Windows
service, check its actual service name and state before starting it. Configure
`DATABASE_URL` for the local instance (including the correct port), then run
the Prisma commands above from the repository root. Do not assume a specific
service name or port; these depend on the local installation.

## Migration and hosting notes

The repository contains an initial PostgreSQL migration for the current
models. Project notes report that the schema has also been pushed to the
intended Supabase database; the local schema and migration files do not
independently verify the current remote database state. Verify connectivity
and migration status with the intended environment before deployment.
