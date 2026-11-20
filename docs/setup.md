# Local Setup

This guide covers installing dependencies, configuring PostgreSQL (local or Supabase), pushing the Drizzle schema, and running FocusFlow locally.

## Prerequisites

- **Node.js**: v20+ (verified on Node.js `v22.23.2` with npm workspaces)
- **PostgreSQL**: v15+ (local installation, Docker container, Supabase, Neon, or Cloud SQL)
- **Firebase project** *(optional)*: Only needed if you want to enable Google Sign-In in addition to email/password authentication.

## Step-by-Step Installation

1. **Install all workspace dependencies** from the repository root:

   ```bash
   npm install
   ```

   Because the root `package.json` defines `"workspaces": ["client", "server"]`, one `npm install` installs packages for the root, `client/`, and `server/`.

2. **Create your `.env` file** at the repository root:

   ```bash
   cp .env.example .env
   ```

   Fill in `JWT_SECRET` and your PostgreSQL connection details (see Environment Variables below).

3. **Push the PostgreSQL schema** using Drizzle Kit (`src/db/schema.ts`):

   ```bash
   npm run db:push
   ```

4. **Verify your setup with the test suite** (runs pure unit tests and live PostgreSQL API integration tests):

   ```bash
   npm test
   ```

5. **Run the application**:

   - **Single-process production-style run** (builds `client/dist` and `server/dist`, serves both UI and `/api` on port `3000`):

     ```bash
     npm run build
     npm start
     ```

   - **Development mode** (builds `client/dist` once, then runs Express with `tsx watch` on port `3000`):

     ```bash
     npm run dev
     ```

   - **Separate Vite hot-reload client + API** (two terminals):

     ```bash
     # Terminal 1 — Express API on port 3000
     npm run dev --workspace=server

     # Terminal 2 — Vite dev server (proxies /api -> http://localhost:3000)
     npm run dev --workspace=client -- --port 5173
     ```

Open `http://localhost:3000` (or `http://localhost:5173` when running Vite separately), register an account, and configure your timezone, theme, Pomodoro defaults, categories, and tags on `/settings`.

![Workspace Settings](./images/settings.png)

## Environment Variables

All runtime variables are read via `dotenv` in `server/src/app.ts`, `server/src/lib/env.ts`, `src/db/index.ts`, `src/db/drizzle.config.ts`, `server/src/lib/firebase-admin.ts`, and Vite (`VITE_*` variables in `client/src/`). See `.env.example` for a template.

### Core Server & Client Variables

| Variable | Required | Default | Purpose | Where to Get / Example |
| --- | --- | --- | --- | --- |
| `PORT` | No | `3000` | Port Express binds on `0.0.0.0` (`server/src/server.ts`) | Set to `3000` locally or platform-assigned port |
| `NODE_ENV` | No | — | Controls production `JWT_SECRET` enforcement and request logging | `development`, `production`, or `test` |
| `JWT_SECRET` | Yes in prod | Derived dev fallback | Secret key (`>= 16` chars in production) used to sign 7-day JWTs | Generate with `openssl rand -hex 32` |
| `CORS_ORIGIN` | No | `localhost:3000`, `localhost:5173`, `127.0.0.1:3000`, `127.0.0.1:5173` | Comma-separated additional allowed browser origins | Your deployed frontend origin(s) |
| `VITE_API_URL` | No | `/api` | Base URL for Axios in `client/src/lib/api.ts` | Keep `/api` when served from Express, or set API origin if hosted separately |

### Database Variables — Option A: Standard PostgreSQL / Supabase URL

Used automatically by `src/db/index.ts` and `src/db/drizzle.config.ts` when Cloud SQL discrete variables are not set.

| Variable | Required | Default | Purpose | Where to Get / Example |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Yes (Option A) | — | Runtime PostgreSQL connection URI (`pg.Pool`). SSL is auto-enabled for non-localhost hosts unless `PGSSLMODE=disable`. | Local Postgres (`postgresql://postgres:pass@localhost:5432/focusflow`) or Supabase **Transaction Pooler** (port `6543`) |
| `DIRECT_URL` | Optional | Falls back to `DATABASE_URL` | Direct non-pooled PostgreSQL URI preferred by `drizzle-kit` for `npm run db:push` | Supabase **Direct Connection** URI (port `5432`) |
| `PGSSLMODE` | No | Auto-detected | Force SSL on (`require`) or off (`disable`) for URL connections | Set `disable` for local/private networks without TLS |

### Database Variables — Option B: Cloud SQL Discrete Credentials

Takes precedence over `DATABASE_URL` when `SQL_HOST`, `SQL_DB_NAME`, and `SQL_USER` are present.

| Variable | Required | Purpose |
| --- | --- | --- |
| `SQL_HOST` | Yes (Option B) | Cloud SQL Unix socket path or host |
| `SQL_PORT` | No | Optional TCP port (omit for Unix sockets) |
| `SQL_DB_NAME` | Yes (Option B) | Target PostgreSQL database name |
| `SQL_USER` | Yes (Option B) | Runtime PostgreSQL username |
| `SQL_PASSWORD` | Yes (Option B) | Runtime PostgreSQL password |
| `SQL_ADMIN_USER` | For migrations | Admin username for `drizzle-kit` (falls back to `SQL_USER`) |
| `SQL_ADMIN_PASSWORD` | For migrations | Admin password for `drizzle-kit` (falls back to `SQL_PASSWORD`) |

### Optional Google Sign-In (Firebase Auth) Variables

Leave all blank to run with email/password authentication only. Alternatively, place a `firebase-applet-config.json` file at the repository root.

| Variable | Side | Purpose | Where to Get |
| --- | --- | --- | --- |
| `FIREBASE_PROJECT_ID` | Server | Enables `firebase-admin` ID token verification in `server/src/lib/firebase-admin.ts` | Firebase Console → Project Settings |
| `VITE_FIREBASE_API_KEY` | Client | Firebase Web API key (`client/src/lib/firebase.ts`) | Firebase Console → Web App Config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client | Firebase Auth domain (defaults to `<projectId>.firebaseapp.com`) | Firebase Console → Web App Config |
| `VITE_FIREBASE_PROJECT_ID` | Client | Firebase Project ID (enables "Continue with Google" UI button) | Firebase Console → Web App Config |

## Available Scripts

### Root (`package.json`)

| Script | Command | What It Does |
| --- | --- | --- |
| `npm run dev` | `npm run build --workspace=client && npm run dev --workspace=server` | Builds the Vite SPA and starts the Express server in watch mode (`tsx watch`) |
| `npm run build` | `npm run build --workspace=client && npm run build --workspace=server` | Type-checks and builds both `client/dist` and `server/dist` |
| `npm start` | `npm run start --workspace=server` | Runs the compiled production server (`node dist/server/src/server.js`) |
| `npm run lint` | `npm run lint --workspace=client` | Runs ESLint across the React client (`client/`) |
| `npm test` | `npx --yes tsx --test server/src/tests/logic.test.ts server/src/tests/api.integration.test.ts client/src/utils/focusTimer.test.ts` | Executes all unit tests and live PostgreSQL API integration tests |
| `npm run db:push` | `npx drizzle-kit push --config=src/db/drizzle.config.ts` | Pushes `src/db/schema.ts` directly to PostgreSQL |

### Workspace-Specific Scripts

- **Client (`client/package.json`)**: `dev` (`vite`), `build` (`tsc -b && vite build`), `lint` (`eslint .`), `preview` (`vite preview`).
- **Server (`server/package.json`)**: `dev` (`tsx watch src/server.ts`), `build` (`tsc`), `start` (`node dist/server/src/server.js`), `test` (`tsx --test src/tests/*.test.ts`).
