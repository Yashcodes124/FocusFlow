# Architecture

Focus Flow uses a small monorepo with independently run frontend and backend
applications. The client communicates with the API over HTTP; the API uses a
layered structure to validate requests, apply business rules, and access
PostgreSQL through Prisma.

## System context

```text
Browser
  └── React + TypeScript + Vite client
        └── Axios requests to /api
              └── Express + TypeScript API
                    ├── Routes and authentication middleware
                    ├── Controllers and Zod request validation
                    ├── Services (business logic and password hashing)
                    └── Repositories → Prisma → PostgreSQL
```

Supabase is the intended PostgreSQL host described in project notes. The code
is configured for PostgreSQL generally, using `DATABASE_URL`; it is not coupled
to Supabase-specific APIs.

## Repository boundaries

- `client/` contains the React/Vite application. Authentication requests are
  organized under `client/src/features/auth/services/`.
- `server/src/routes/` maps HTTP paths to controllers.
- `server/src/controllers/` handles HTTP input and response status codes.
- `server/src/validators/` defines request schemas using Zod.
- `server/src/services/` contains application rules, including password
  hashing and credential verification.
- `server/src/repositories/` accesses persisted records through Prisma.
- `server/src/middlewares/` contains shared request behavior, including JWT
  authentication.
- `server/prisma/` contains the data model and checked-in migrations.
- `shared/` is reserved for shared client/server code; it is not currently a
  required runtime dependency.

## Authentication flow

1. The client submits credentials to `POST /api/users/register` or
   `POST /api/users/login`.
2. The API validates the request. Registration hashes the password with bcrypt;
   login compares it against the stored hash.
3. On success, the API returns the user profile and a signed JWT. Password
   hashes are excluded from the returned profile.
4. The client stores the token in browser `localStorage` and attaches it as a
   bearer token to subsequent Axios requests.
5. Protected routes verify the token using `JWT_SECRET`, extract the user ID,
   and use it to scope the request.

The JWT lifetime is seven days. Storing tokens in `localStorage` is simple for
the current integration but increases exposure if a cross-site scripting
vulnerability is introduced. Revisit token storage and session lifecycle
before production.

## API routes currently present

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/users/register` | Public | Create an account and return a JWT |
| `POST` | `/api/users/login` | Public | Verify credentials and return a JWT |
| `GET` | `/api/users/me` | Bearer token | Return the current user's profile |
| `GET` | `/api/users/:id` | Bearer token; own ID only | Return the authenticated user's profile |
| `POST` | `/api/tasks` | Bearer token | Create a task for the authenticated user |

The API currently enables CORS without an origin allowlist. Configure an
explicit production policy before exposing it publicly.

## Planned capabilities

AI note processing, related-topic discovery, focus timers, and additional task,
habit, category, tag, and notification workflows are product goals. Although
some of these entities exist in the database schema, their full API and UI
workflows are not yet implemented.