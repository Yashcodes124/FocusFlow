# Focus Flow: Project Overview

Focus Flow is a productivity application intended to bring notes, actionable
tasks, and focused work into one low-distraction experience. Its longer-term
direction is to connect captured notes to related topics and suggested actions
through AI-assisted analysis.

This repository is an active foundation for that product, not a finished
feature-complete application. The frontend and API are in place, along with an
initial authentication flow, task creation endpoint, and PostgreSQL data model.
AI note analysis, focus sessions, and production deployment remain planned work.

## Product problem

Conventional note and task tools can leave information fragmented and require
people to manually turn notes into follow-up work. Focus Flow aims to combine
capture with contextual discovery and task extraction, while supporting
distraction-free work.

## Technology

| Area | Technology |
| --- | --- |
| Web client | React, TypeScript, Vite |
| Styling | Tailwind CSS is installed; styling is still evolving |
| HTTP client | Axios |
| API | Node.js, Express 5, TypeScript |
| Authentication | bcrypt password hashing and JWT bearer tokens |
| Validation | Zod |
| Persistence | PostgreSQL, Prisma 7, `pg` adapter |
| Database hosting | Supabase is the intended host described in project notes; the application connects through a generic PostgreSQL URL |

## Repository layout

```text
client/      React and Vite application
server/      Express API, Prisma schema, and migrations
shared/      Reserved for types or utilities shared by both applications
docs/        Project, architecture, database, and status documentation
```

## Development roadmap

The original three-day plan is a proposed sequence of work, not a claim that
all planned features are complete:

1. **Foundation and authentication:** client/server setup, database connection,
   registration and login.
2. **Notes and AI-assisted task extraction:** capture notes, analyze content,
   and connect extracted actions to task workflows.
3. **Focus mode and delivery:** add focus sessions and time tracking, polish
   responsive UI, test end to end, and prepare deployment.

For implemented features and known gaps, see [Current Status](./current-status.md).
