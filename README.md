# Primero Srv LLC — Platform & Sovereign Admin Gateway

Accredited corporate advisory platform for sovereign Certificate Authority (CA) validation, Public Key Infrastructure (PKI), and certified broker intermediary solutions, featuring connected frontend and live agent backend operations.

## Architecture & Core Portals

The platform delivers unified cross-navigation between client-facing services and backend administration:

1. **Website Frontend (`/`)**:
   - Comprehensive service showcase for CA Certification, PKI Trust Infrastructure, and Certified Broker Provisions.
   - Interactive Sector Vector Graphics engine rendering real-time cryptographic and market routing schematics.
   - Integrated client concierge chat widget with live handoff to institutional specialists.
   - Direct links to authoritative regulatory channels (FINRA, BrokerCheck, SEC EDGAR, FINRA Gateway).
   - Embedded client-side command terminal REPL.

2. **Admin Live Agent Chat Backend Terminal (`/admin`)**:
   - Real-time customer chat thread inspection and queue management.
   - Live specialist reply composer with instant push to active client sessions.
   - Live Agent Chat Backend Terminal with CLI directives for daemon status, thread query, and CLI reply dispatch.
   - Dedicated Sovereign Admin Console covering administrative oversight and daemon telemetry.

## Key Technologies

- **Netlify Server**: Long-running Node.js process hosted in `netlify/server/index.mjs` handling all `/api/*` endpoints.
- **Netlify Database (Managed Postgres)**: Structured data persistence configured with Drizzle ORM schemas in `db/schema.ts` and automated migrations in `netlify/database/migrations/`.
- **Drizzle ORM & Kit**: Schema-driven database migrations and query management.
- **Frontend Engine**: Pure responsive HTML5, modern CSS3 variables, and vanilla HTML5 Canvas 2D vector graphic engines without heavy build dependencies.

## Directory Structure

```
├── db/
│   ├── index.ts              # Netlify Database client initialization
│   └── schema.ts             # Drizzle ORM schema for chat threads & messages
├── netlify/
│   ├── database/migrations/  # Generated SQL migrations
│   └── server/
│       └── index.mjs         # Netlify Server entrypoint (/api/*)
├── public/
│   ├── index.html            # Website frontend
│   ├── admin.html            # Admin live agent console & backend terminal
│   └── admin/
│       └── index.html        # Admin route mirror
├── drizzle.config.ts         # Drizzle configuration
├── netlify.toml              # Netlify routing, database, and build configuration
└── package.json              # Project dependencies
```

## Running Locally

To run the application locally using the Netlify CLI:

```bash
/opt/buildhome/node-deps/node_modules/.bin/netlify dev --port 8889
```

This starts the local dev server on port 8889 with local emulation for Netlify Server, Database, and static routing.
