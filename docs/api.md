# FocusFlow API Reference

All API routes are served under `/api`. Requests and responses use `application/json`.

## Authentication

Protected endpoints require an `Authorization: Bearer <token>` header. FocusFlow accepts two bearer token formats:

1. **Email/Password JWT** issued by `POST /api/users/register` or `POST /api/users/login` (signed with `JWT_SECRET`, 7-day expiry, includes `tokenVersion` verified against the user row so `POST /api/users/logout` immediately invalidates existing tokens).
2. **Firebase Auth ID Token** from Google Sign-In (`signInWithPopup`), verified server-side via `firebase-admin` and automatically mapped to a PostgreSQL `users` record.

All resources are strictly scoped to the authenticated user (`req.user.id`). Cross-user access returns `403` or `404`.

## Error Format

```json
{
  "error": "Human-readable error message",
  "code": "VALIDATION_ERROR",
  "details": []
}
```

Validation errors (`400`), unauthorized (`401`), forbidden (`403`), not found (`404`), conflict (`409`), and rate-limit (`429`) responses follow this consistent shape. Stack traces and database internals are never returned to clients.

---

## Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Liveness check (`{ status: "ok", timestamp }`). |

## Users & Auth (`/api/users`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/users/register` | Public (rate-limited) | Create account (`name`, `email`, `password`). Returns `{ user, token }`. |
| `POST` | `/api/users/login` | Public (rate-limited) | Verify credentials (`email`, `password`). Returns `{ user, token }`. |
| `POST` | `/api/users/logout` | Bearer | Increments `tokenVersion` to invalidate issued FocusFlow JWTs. |
| `GET` | `/api/users/me` | Bearer | Restore current authenticated user profile & preferences. |
| `PATCH` | `/api/users/me` | Bearer | Update `name`, `theme` (`LIGHT` \| `DARK`), `timezone`, `defaultFocusMinutes`, `defaultBreakMinutes`. |
| `GET` | `/api/users/:id` | Bearer (own ID) | Fetch authenticated user's profile. Returns `403` for other IDs. |

## Dashboard (`/api/dashboard`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/dashboard` | Bearer | Aggregated real metrics: task counts (`total`, `completed`, `overdue`, `dueToday`), `todayTasks`, `overdueTasks`, `upcomingTasks`, `habits`, `focusStats` (today + 7-day minutes/sessions), and `recentNotes`. |

## Tasks (`/api/tasks`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/tasks` | Bearer | List tasks with filtering & pagination. Query params: `status` (`TODO` \| `IN_PROGRESS` \| `DONE`), `priority` (`LOW` \| `MEDIUM` \| `HIGH`), `categoryId`, `tagId`, `due` (`today` \| `overdue` \| `upcoming`), `search`, `sortBy` (`createdAt` \| `dueDate` \| `priority` \| `title`), `sortOrder` (`asc` \| `desc`), `page`, `limit`. |
| `POST` | `/api/tasks` | Bearer | Create task (`title`, `description?`, `status?`, `priority?`, `dueDate?`, `estimatedMinutes?`, `categoryId?`, `tagIds?`). |
| `GET` | `/api/tasks/:id` | Bearer | Fetch single task with category and tags. |
| `PATCH` | `/api/tasks/:id` | Bearer | Update task fields and/or replace `tagIds`. |
| `PATCH` | `/api/tasks/:id/toggle` | Bearer | Toggle task between `DONE` (sets `completedAt`) and `TODO`. |
| `DELETE` | `/api/tasks/:id` | Bearer | Delete task owned by the user. |

## Habits (`/api/habits`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/habits` | Bearer | List habits with computed `completedToday`, `currentStreak`, `bestStreak`, `completedDates`, and 7-day history in the user's timezone. |
| `POST` | `/api/habits` | Bearer | Create habit (`name`, `description?`, `frequency?`, `targetPerPeriod?`, `color?`). |
| `PATCH` | `/api/habits/:id` | Bearer | Update habit fields or `archived` status. |
| `DELETE` | `/api/habits/:id` | Bearer | Delete habit and its completion logs. |
| `POST` | `/api/habits/:id/check-in` | Bearer | Toggle completion for a `YYYY-MM-DD` date (`date?`, defaults to today in user's timezone) and recalculate streaks. |

## Categories & Tags (`/api/categories`, `/api/tags`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/categories` | Bearer | List user categories. |
| `POST` | `/api/categories` | Bearer | Create category (`name`, `color?`). |
| `PATCH` | `/api/categories/:id` | Bearer | Update category (`name?`, `color?`). |
| `DELETE` | `/api/categories/:id` | Bearer | Delete category (tasks retain data with `categoryId = null`). |
| `GET` | `/api/tags` | Bearer | List user tags. |
| `POST` | `/api/tags` | Bearer | Create tag (`name`, `color?`). |
| `PATCH` | `/api/tags/:id` | Bearer | Update tag (`name?`, `color?`). |
| `DELETE` | `/api/tags/:id` | Bearer | Delete tag and join rows in `task_tags`. |

## Focus Sessions (`/api/focus`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/focus/overview` | Bearer | Fetch recent sessions and aggregated today / 7-day focus minutes & session counts. |
| `POST` | `/api/focus/sessions` | Bearer | Start a persisted focus or break session (`type`, `plannedMinutes`, `taskId?`, `notes?`). |
| `PATCH` | `/api/focus/sessions/:id/complete` | Bearer | Mark session `COMPLETED` or `INTERRUPTED` with `actualMinutes`, `notes?`, and optional `markTaskDone: true`. |

## Notes (`/api/notes`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/notes` | Bearer | List notes (pinned first, newest first). Optional `?search=` filter. |
| `POST` | `/api/notes` | Bearer | Create note (`title`, `content`, `pinned?`). |
| `GET` | `/api/notes/:id` | Bearer | Fetch single note. |
| `PATCH` | `/api/notes/:id` | Bearer | Update note (`title?`, `content?`, `pinned?`). |
| `DELETE` | `/api/notes/:id` | Bearer | Delete note. |
| `POST` | `/api/notes/:id/extract-tasks` | Bearer | Deterministically parse checkboxes (`- [ ]`), `TODO:`/`Action:` lines, and imperative bullets into real tasks in PostgreSQL. |
