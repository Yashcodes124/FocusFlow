# FocusFlow Project Overview

This document explains what has been completed so far in the FocusFlow project. It is written in easy terms to help you understand the setup and structure.

---

## 1. Project Root

The main project folder is `FocusFlow/` and it contains these top-level items:

- `client/` — the frontend application
- `server/` — the backend application
- `shared/` — shared code or types for both frontend and backend
- `docs/` — documentation files
- `package.json` — root package file (currently a simple placeholder)
- `README.md` — basic project description
- `.gitignore` — ignores local files like `node_modules/`

---

## 2. Client Setup

The client app was created using Vite with React and TypeScript.

What was installed:
- `react-router-dom` — for page routing
- `axios` — for making HTTP requests
- `react-hook-form` — for handling forms
- `zod` — for validation and schema rules
- `tailwindcss` and `@tailwindcss/vite` — for styling support

The client `src/` folder now contains the following structure with placeholder folders and files:

- `assets/` (images, icons, fonts)
- `components/` (ui, layout, forms, charts, common)
- `features/` (auth, dashboard, tasks, habits, profile)
- `hooks/`
- `context/`
- `routes/`
- `services/`
- `utils/`
- `lib/`
- `types/`
- `constants/`
- `styles/`
- `App.tsx`
- `main.tsx`

Specific feature folders also include starter files for `types.ts` and `validation.ts` where needed.

---

## 3. Server Setup

The server app was initialized with `npm init -y`.

What was installed:
- `express` — web server framework
- `cors` — allows browser requests from other domains
- `dotenv` — loads environment settings from `.env`
- `bcrypt` — password hashing
- `jsonwebtoken` — token-based authentication
- `zod` — request validation

Dev tools installed:
- `typescript` — enables TypeScript in the backend
- `ts-node-dev` — runs TypeScript code during development
- `@types/node`, `@types/express`, `@types/jsonwebtoken`, `@types/bcrypt`

The server `src/` folder structure was created with placeholders:

- `config/`
- `controllers/`
- `services/`
- `repositories/`
- `routes/`
- `middlewares/`
- `validators/`
- `utils/`
- `interfaces/`
- `types/`
- `constants/`
- `app.ts`
- `server.ts`

---

## 4. Prisma Setup

Prisma was installed for database access.

Installed packages:
- `prisma`
- `@prisma/client`

Prisma initialization created:
- `prisma/schema.prisma`
- `prisma.config.ts`
- `server/.env`
- `server/.gitignore`

This means the backend is ready for database modeling once you decide on the schema and database.

---

## 5. Current Status

The project is now prepared with the foundation in place:

- The frontend has a React TypeScript Vite app and a full folder structure.
- The backend has a TypeScript Express app structure and core dependencies.
- Prisma is initialized and ready for database modeling.

No business logic is written yet. The next steps are:

1. Add actual React page/component code in `client/src`
2. Add server routes and controllers in `server/src`
3. Define the database schema in `server/prisma/schema.prisma`
4. Connect the backend to the database and run migrations

---

## 6. How to use this document

Open `PROJECT_OVERVIEW.md` in the FocusFlow root whenever you want a quick summary of the current project setup.

