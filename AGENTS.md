# Developer & Agent Guide: frontend-backend-links

This document details the system design, file layout, data flow, and conventions for AI coding agents and engineers working on this codebase.

## System Overview

The site connects a client-facing corporate website (`public/index.html`) with an administrative operations center (`public/admin.html`), bridged by a Node.js Netlify Server (`netlify/server/index.mjs`) and Netlify Postgres Database.

### Direct Navigation & Linking Contracts

- **Website Frontend**: Clean, professional client-facing portal (`public/index.html`). Internal chat console links, debug terminal buttons, and admin routing are omitted from the main website headers to maintain authoritative corporate presentation.
- **Admin Console & Live Backend Terminal**: Hosted on a dedicated endpoint (`/admin`, `public/admin.html`), providing specialist chat monitoring, visitor transcript review, and daemon CLI controls. The admin header features a direct domain link pointing back to the live public domain (`https://frontend-backend-links.netlify.app/`).

### Backend API (`/api/*`)

All dynamic traffic routes through `netlify/server/index.mjs` configured in `netlify.toml`:
- `GET /api/status`: Returns system telemetry, uptime, and database connection state.
- `GET /api/admin/threads`: Retrieves all customer chat threads sorted by update time.
- `GET /api/admin/thread/:clientId`: Retrieves message history for a given thread.
- `POST /api/admin/reply`: Dispatches specialist reply to a client session.
- `GET /api/chat/thread/:clientId`: Client polling endpoint for conversation updates.
- `POST /api/chat/message`: Ingests customer inquiries and generates automated responses or queues for specialist review.
- `POST /api/chat/handoff`: Escalates client session to `waiting_specialist` status.

### Database Persistence & Migrations

- Schemas are defined in `db/schema.ts` using `drizzle-orm/pg-core`.
- The database client is exported from `db/index.ts` using `drizzle-orm/netlify-db`.
- Database migrations reside in `netlify/database/migrations/`.
- If schema changes are introduced, generate migrations via `npx drizzle-kit generate`. Do not execute migrations manually; the Netlify platform executes them automatically on deploy.
- The server incorporates in-memory fallback cache so all endpoints remain operable even if database provisioning is in progress.

### Conventions

- Static assets belong in `public/`.
- `public/admin/index.html` is kept mirrored with `public/admin.html` for complete URL resolution across `/admin` and `/admin/`.
- Keep headers visually consistent across both pages, maintaining the brand color palette defined by `--primero-navy` (`#002b49`), `--primero-cyan` (`#0284c7`), and `--primero-accent-light` (`#38bdf8`).
