# Architecture

FocusFlow is a TypeScript full-stack workspace connecting task planning, daily habit execution, timestamp-resilient focus sessions, and structured note capture against a managed PostgreSQL database.

## System Context

```text
Browser (React 19 + TypeScript + Vite + Tailwind CSS v4)
  ├── Protected App Shell (Dashboard, Tasks, Habits, Focus, Notes, Settings)
  ├── Axios client (/api/*) with Bearer auth interceptor
  └── Timestamp-based Focus Timer (survives page refresh)
        │
        ▼ HTTP JSON (/api/*)
Express + TypeScript Server (Port 3000)
  ├── Security headers, restricted CORS allowlist, request logger
  ├── Rate limiters (global API + stricter auth limiter)
  ├── Auth middleware (FocusFlow JWT w/ tokenVersion + Firebase Admin ID Token)
  ├── Routes → Controllers → Zod Validators → Services → Repositories
  └── Centralized error middleware (sanitized JSON responses)
        │
        ▼ pg.Pool (Drizzle ORM)
Cloud SQL PostgreSQL (src/db/schema.ts)
```

## Directory Boundaries

- `src/db/`: Shared PostgreSQL layer using Drizzle ORM (`schema.ts`, `index.ts`, `drizzle.config.ts`).
- `server/src/`:
  - `routes/` — HTTP route definitions under `/api/*`.
  - `controllers/` — Request parsing, response formatting, status codes.
  - `validators/` — Strict Zod v4 schemas for all body and query inputs.
  - `services/` — Business rules, ownership checks, streak calculation, note action-item extraction.
  - `repositories/` — Type-safe Drizzle ORM PostgreSQL queries.
  - `middlewares/` — Auth verification, rate limiting, and centralized error handling.
  - `utils/` — Pure, unit-tested logic (`jwt.ts`, `streak.ts`, `noteExtractor.ts`).
- `client/src/`:
  - `features/` — Domain types, Zod form validation schemas, and Axios service clients (`auth`, `tasks`, `habits`, `focus`, `notes`, `dashboard`).
  - `context/` — `AuthContext` for session restoration (`GET /api/users/me`), theme sync, and logout.
  - `components/` — Reusable accessible primitives (`Button`, `FormFields`, `Modal`, `States`), `AppLayout`, `ProtectedRoute`, and `TaskFormModal`.
  - `pages/` — Route views for Login/Register, Dashboard, Tasks, Habits, Focus, Notes, and Settings.
  - `utils/` — Pure date helpers and timestamp-based Focus Timer state machine (`focusTimer.ts`).

## Authentication & Token Storage Trade-offs

FocusFlow supports two complementary authentication paths:

1. **Email & Password (JWT)**: Credentials are validated with Zod and hashed using `bcryptjs` (12 salt rounds). Login returns a signed 7-day JWT containing `{ userId, tokenVersion }`. Calling `POST /api/users/logout` increments `users.token_version` in PostgreSQL, immediately revoking previously issued JWTs on the server.
2. **Google Sign-In (Firebase Auth)**: Users can authenticate via Firebase Auth popup (`signInWithPopup`). The Firebase ID token is kept strictly in memory (never written to `localStorage`), verified server-side with `firebase-admin`, and automatically upserted into PostgreSQL `users` so all relational ownership and preferences work identically.

### `localStorage` JWT vs. `HttpOnly` Cookie Trade-offs

- **Current choice (`localStorage` for email/password JWT + memory-only Firebase ID token)**: Compatible with embedded iframe previews and cross-origin development without `SameSite=None; Secure` cookie rejection, and keeps the API stateless for Bearer-token clients. Server-side `tokenVersion` checks allow instant logout revocation.
- **Trade-off**: Any JavaScript running on the origin can read `localStorage`, making strict XSS hygiene mandatory (React automatic escaping, no `dangerouslySetInnerHTML`, strict Zod input validation, sanitized error responses).
- **Hardening path for standalone custom-domain production**: Move the email/password session token to a `Secure; HttpOnly; SameSite=Lax` cookie paired with CSRF protection (double-submit token or `Origin` check) and short-lived access tokens with refresh token rotation.

## Resilient Focus Timer Design

Rather than relying solely on `setInterval` decrements (which drift in background tabs and reset on page reload), `client/src/utils/focusTimer.ts` persists `{ status, mode, startedAtMs, endAtMs, remainingSeconds, totalSeconds, activeSessionId, linkedTaskId }` using wall-clock timestamps. On every tick or reload, remaining seconds are derived from `endAtMs - Date.now()`, ensuring accuracy across refreshes and tab throttling.

## Environment & Deployment

Configure the environment variables listed in `.env.example`:

- `PORT` (default `3000`)
- `JWT_SECRET` (required in production; 32+ random characters)
- `CORS_ORIGIN` (comma-separated allowed origins)
- `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD` (runtime PostgreSQL credentials)
- `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD` (schema migrations via Drizzle Kit)

Build and start commands:

```bash
npm run build   # Builds Vite frontend (client/dist) and compiles server TypeScript
npm run start   # Starts Express server serving /api/* and client/dist SPA
npm run test    # Runs unit and PostgreSQL integration tests
```
