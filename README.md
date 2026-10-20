# Focus Flow

Focus Flow is a productivity application in active development. Its goal is to
bring notes, actionable tasks, and focused work into one low-distraction
experience, with AI-assisted note analysis planned for a future phase.

The repository currently contains a React/TypeScript client, an Express API,
JWT-based authentication, task creation, and a PostgreSQL data model. The
complete notes, AI, and focus-mode workflows are not yet implemented.

## Technology

- **Client:** React, TypeScript, Vite, Axios
- **API:** Node.js, Express, TypeScript, Zod
- **Authentication:** bcrypt password hashing and JWT bearer tokens
- **Database:** PostgreSQL with Prisma 7
- **Hosting direction:** Supabase PostgreSQL is identified in project notes;
  the application uses a standard PostgreSQL connection string.

## Run locally

Install dependencies from the repository root:

```powershell
npm --prefix client install
npm --prefix server install
```

Configure `server/.env` with `DATABASE_URL` and a strong `JWT_SECRET`. The
client uses `http://localhost:3000/api` by default; set `VITE_API_URL` in the
client environment to override it.

Run the API and client in separate terminals:

```powershell
npm --prefix server run dev
npm --prefix client run dev
```

## Documentation

- [Project overview](./docs/project-overview.md)
- [Architecture and API](./docs/architecture.md)
- [Database and migrations](./docs/database.md)
- [Current status and priorities](./docs/current-status.md)

See the status document for implemented features, planned work, and known
build/test limitations.
