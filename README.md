# FocusFlow

FocusFlow is a full-stack productivity workspace that connects daily task execution, habit consistency, timed focus sessions, and structured note-taking in one PostgreSQL-backed application. Built with React 19, TypeScript, Tailwind CSS v4, Express 5, and Drizzle ORM, it runs as a single full-stack service with full authentication, session restoration, and automated test coverage.

![App Preview](./docs/images/preview.png)

## Key Features

- **Authentication & Session Security**: Email/password registration and login (`bcryptjs` + 7-day JWT with server-side `tokenVersion` revocation on logout), session restoration via `GET /api/users/me`, protected routes, rate limiting, and optional Google Sign-In via Firebase Auth.
- **Dashboard Overview**: Live metrics for open tasks, completed today, daily habits, and today/7-day focus minutes, paired with quick task capture and prioritized Today, Overdue, and Upcoming views.
- **Tasks, Categories, Tags & Quick Attachments**: Full CRUD, atomic bulk creation, completion toggle, priority and status filters, due-date filters (`today`, `overdue`, `upcoming`, `no_date`), real-time highlighted search across title and description, sorting, pagination, custom categories, many-to-many tags, and lightweight file attachments (up to 2 files per task, max 512 KB each, stored directly in PostgreSQL with authenticated downloads).
- **Global Keyboard Shortcuts**: Workspace-wide navigation and capture shortcuts — `Ctrl+N` / `Alt+N` / `N` (new task from any page), `Ctrl+K` / `Cmd+K` (jump to task search), `Ctrl+Shift+A` / `Alt+A` (AI Task Decomposer), `Ctrl+Shift+D` (toggle theme), two-key `G` navigation chords (`G` then `D`/`T`/`H`/`F`/`N`/`S`), and `?` to open the Keyboard Shortcuts cheat sheet.
- **Context-Aware AI Task Decomposer & Effort Estimator**: Break broad goals into 3–6 prioritized, Pomodoro-sized subtasks (`1–4` Pomodoros each) informed by your existing categories, tags, and pending workload, with inline editing and atomic batch creation (`POST /api/ai/decompose-task` + `POST /api/tasks/bulk`).
- **Habit Tracking & Streaks**: Daily/weekly/monthly habits with timezone-aware check-ins, 7-day history tracking, and calculated current/best streaks.
- **Resilient Focus Timer**: Pomodoro focus and break modes linked to tasks, backed by wall-clock timestamps in `localStorage` so active timers survive page refreshes, with persisted session logging to PostgreSQL.
- **Notes & Task Extraction**: Searchable, pinnable notes with deterministic extraction of `- [ ]` checkboxes and `TODO:` / `ACTION:` lines directly into Tasks.
- **Workspace Settings**: Profile management, persisted light/dark mode toggle, timezone, customizable Pomodoro durations, and category/tag management.

## Quick Start

```bash
# 1. Install workspace dependencies (root, client, and server)
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env with JWT_SECRET, DATABASE_URL (local Postgres or Supabase), and optional GEMINI_API_KEY

# 3. Push the Drizzle PostgreSQL schema
npm run db:push

# 4. Run unit and PostgreSQL integration tests
npm test

# 5. Build and start on http://localhost:3000
npm run build
npm start
```

## Documentation

- [Architecture](./docs/architecture.md) — System overview, tech stack, folder structure, routes, and Mermaid architecture/auth diagrams.
- [Local Setup](./docs/setup.md) — Prerequisites, installation steps, environment variable reference, and npm scripts.
- [API & Data Reference](./docs/api-and-data.md) — PostgreSQL schema with Mermaid ER diagram and complete REST endpoint reference.
- [Deployment](./docs/deployment.md) — Build pipeline, production environment requirements, and Node.js PaaS deployment checklist.
