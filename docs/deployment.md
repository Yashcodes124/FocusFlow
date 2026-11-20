# Deployment

FocusFlow is built to deploy as a **single Node.js service** where Express serves both `/api/*` and the compiled Vite SPA from `client/dist/` (`server/src/app.ts`).

> **Existing infrastructure files**: This repository does not currently include a `Dockerfile`, `docker-compose.yml`, `vercel.json`, `render.yaml`, or `.github/workflows/` CI files. Deployment is driven directly by the root `package.json` scripts and environment variables.

## Build & Start Pipeline

```bash
# 1. Install dependencies for root, client, and server workspaces
npm install

# 2. Push Drizzle schema to your target PostgreSQL database (first deploy or schema changes)
npm run db:push

# 3. Compile client (client/dist) and server (server/dist/server/src/server.js)
npm run build

# 4. Start the production Express server on 0.0.0.0:$PORT
npm start
```

### What `npm run build` Produces

1. **Client (`client/package.json`)**: Runs `tsc -b && vite build`, emitting static assets and `index.html` to `client/dist/`.
2. **Server (`server/package.json`)**: Runs `tsc` (`server/tsconfig.json`, `rootDir: ".."`, `outDir: "./dist"`), compiling `server/src/**/*` and `src/db/**/*` to `server/dist/server/src/server.js`.
3. **Runtime SPA Fallback**: On startup, `server/src/app.ts` resolves `client/dist/index.html`, serves static assets via `express.static`, and serves `index.html` for all non-`/api` `GET` requests so React Router client-side routes work on direct navigation and refresh.

## Production Environment Requirements

Set the following environment variables in your hosting provider's secret manager (never commit `.env`):

| Variable | Requirement in Production | Notes |
| --- | --- | --- |
| `NODE_ENV` | Set to `production` | Enforces strong `JWT_SECRET` check on boot (`server/src/lib/env.ts`) |
| `PORT` | Optional (defaults to `3000`) | Server binds to `0.0.0.0:${PORT}` (`server/src/server.ts`) |
| `JWT_SECRET` | **Required** (`>= 16` chars; recommend 32+ random bytes) | Server throws on startup in production if missing or shorter than 16 characters |
| `CORS_ORIGIN` | Recommended | Comma-separated production origin(s), e.g., `https://app.yourdomain.com`. Same-origin requests and `https://*.run.app` are already permitted. |
| `DATABASE_URL` | **Required** (unless using Cloud SQL discrete vars) | Standard PostgreSQL or Supabase Transaction Pooler URL; SSL (`rejectUnauthorized: false`) is enabled automatically for non-localhost hosts |
| `DIRECT_URL` | Recommended for Supabase | Direct port-5432 PostgreSQL URL used when running `npm run db:push` |
| `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD` | Alternative to `DATABASE_URL` | Used automatically when deploying against Cloud SQL Unix sockets or discrete credentials |
| `FIREBASE_PROJECT_ID`, `VITE_FIREBASE_*` | Optional | Only required if enabling Google Sign-In. Note that `VITE_*` variables must be present at **build time** (`npm run build`) because Vite inlines them into `client/dist`. |

## Deploying to Node.js PaaS (Render, Railway, Fly.io, Cloud Run)

Because Express serves both the frontend bundle and the API on one port, any standard Node.js 20+ host works with these settings:

- **Runtime**: Node.js 20 or 22
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `GET /api/health` (returns `200` with `{"success":true,"data":{"status":"ok"}}`)
- **Proxy Configuration**: `app.set("trust proxy", 1)` is already enabled in `server/src/app.ts` so `express-rate-limit` reads client IPs accurately behind reverse proxies.

## Pre-Release Verification Checklist

1. Run `npm run lint` to confirm zero ESLint issues in `client/`.
2. Run `npm run build` to verify both TypeScript builds and Vite bundling succeed.
3. Run `npm test` against a non-production test database to confirm unit tests and PostgreSQL API integration tests pass.
4. Confirm `GET /api/health` responds `200 OK` after deployment.
