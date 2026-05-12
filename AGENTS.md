# AGENTS.md

This file contains mandatory instructions for all future AI coding agents working on `locker-mvp`.

The project is an MVP for an electronic luggage locker system with a Telegram MiniApp, admin panel, public display page, backend API, PostgreSQL database, Docker Compose deployment, and Nginx routing.

## Current Stage

The repository has completed Stage 9: final verification, cleanup, and start instructions. Stage 10 and Stage 11 are planned next and are documentation-only until explicitly implemented.

The backend scaffold, Prisma schema, initial migration, seed script, users module, lockers module, storage sessions module, public read-only module, JWT-protected admin backend, user-facing Telegram MiniApp frontend, admin frontend, public display frontend, Docker Compose deployment file, app Dockerfiles, Nginx routing config, and simple start/stop helper scripts exist.

## Mandatory Files to Read Before Editing

Before making any code, configuration, schema, Docker, deployment, or documentation change, read:

1. `README.md`
2. `AGENTS.md`
3. `docs/architecture.md`
4. `docs/deployment.md`
5. `docs/implementation-plan.md`

If any of these files are missing, recreate or repair the missing documentation before continuing.

## Plan Before Coding

Never start coding before understanding the current architecture and current implementation stage.

Before substantial edits:

1. Inspect the existing files.
2. Identify the current implementation stage.
3. Explain the planned change.
4. Confirm which documentation files must be updated.

If the requested change is ambiguous, propose a plan first instead of editing code.

## Documentation Is Mandatory

After every code change, configuration change, database schema change, Docker change, deployment change, or meaningful behavior change, update the relevant documentation in the same task.

Documentation must never be treated as optional.

Required documentation behavior:

- Update `README.md` when commands, setup, environment variables, or project structure change.
- Update `docs/architecture.md` when modules, flows, data model, or responsibilities change.
- Update `docs/deployment.md` when Docker, Nginx, environment variables, migrations, seed process, logs, restart, backup, or restore steps change.
- Update `docs/implementation-plan.md` when stages, scope, priorities, assumptions, acceptance criteria, or MVP boundaries change.
- Update `AGENTS.md` when future-agent rules need to change.

If you change implementation without updating relevant documentation, the task is incomplete.

## Implementation Plan Maintenance

`docs/implementation-plan.md` is a living project plan.

Future agents must keep it current when:

- A stage is started.
- A stage is completed.
- Stage order changes.
- MVP scope changes.
- Priorities change.
- Acceptance criteria change.
- Assumptions become false.
- A feature is explicitly added to or removed from MVP scope.

Do not let the implementation plan drift from the repository state.

## MVP Architecture

Use this architecture unless the user explicitly approves a different one:

- Frontend: React + Vite + TypeScript.
- Backend: NestJS + TypeScript.
- Database: PostgreSQL.
- ORM: Prisma.
- Deployment: Docker Compose.
- Reverse proxy: Nginx.

Planned apps:

- `apps/tma`: Telegram MiniApp for users.
- `apps/admin`: admin web panel.
- `apps/display`: public locker display.
- `backend/api`: backend API.
- `infra`: Docker Compose and Nginx files.

Keep frontend apps thin. Business logic belongs in the backend API.

## MVP Boundaries

Build only the MVP described in the documentation unless the user explicitly expands scope.

The MVP includes:

- User profile display in Telegram MiniApp.
- User balance display.
- Active storage sessions.
- Storage history.
- Starting a storage session by selecting size `S`, `M`, `L`, or `XL`.
- Finishing a storage session and releasing the locker.
- Admin locker list.
- Admin locker status changes between `AVAILABLE` and `MAINTENANCE`.
- Admin active sessions view.
- Admin users view.
- Basic admin dashboard stats.
- Public locker display grid.
- PostgreSQL persistence.
- Prisma migrations and seed data.
- Docker Compose deployment.
- Nginx routing.
- Planned Stage 10: full Telegram MiniApp authentication using backend-validated Telegram `initData`.
- Planned Stage 11: simple fixed locker pricing and balance deduction.

## Forbidden MVP Features

Do not add these unless the user explicitly requests and approves a scope change:

- Real payments.
- Payment providers.
- Invoices.
- Refunds.
- Transaction history.
- Physical locker integration.
- WebSockets.
- Complex analytics.
- Multiple locker locations.
- QR codes.
- 3D visualization.
- Real baggage dimension input.
- Complex admin roles or permissions.
- Complex event sourcing or CQRS.
- Microservices.
- Kubernetes.
- Message queues.
- External managed services required for core MVP operation.

Until Stage 11 is implemented, the `User.balance` field is only a numeric database field. It is displayed in the MiniApp and may be edited manually in the database for MVP testing. Stage 11 must keep the MVP free of real payments while adding fixed prices and balance deduction.

## Planned Stage 10 Telegram MiniApp Authentication Rules

Stage 10 is planned but not implemented yet.

Rules for future implementation:

- Replace the placeholder `telegramId` identity flow with Telegram MiniApp `initData` authentication.
- The frontend must send the raw Telegram `initData` string to the backend.
- The backend must validate `initData` cryptographically using the Telegram bot token before creating or updating a user.
- The backend must not trust `initDataUnsafe` for authentication or authorization.
- After successful validation, the backend should issue a short-lived TMA JWT containing the internal `userId` and Telegram identity.
- TMA user, balance, session, start-session, and finish-session APIs must require that TMA JWT and derive identity from it.
- The TMA should prefer in-memory token storage and re-authenticate from Telegram `initData` on app load.
- The editable demo `telegramId` must be removed from production and allowed only behind an explicit local development mode.
- Local development behavior when Telegram `initData` is unavailable must be documented.
- Security assumptions and limitations must be documented in `README.md`, `docs/architecture.md`, `docs/deployment.md`, and `docs/implementation-plan.md`.

## Planned Stage 11 Balance and Pricing Rules

Stage 11 is planned but not implemented yet.

Rules for future implementation:

- New users must start with balance `1000`.
- Fixed locker prices are `S = 5`, `M = 7`, `L = 10`, and `XL = 15`.
- Price must be based on the assigned locker size, not the requested luggage size.
- If a user requests `M` but the backend assigns an `L` locker, the cost is `10`.
- Before starting storage, the backend must check that the user has enough balance for the assigned locker size.
- If balance is insufficient, storage must not start and no locker should become `OCCUPIED`.
- When finishing storage, the backend must deduct the cost based on the assigned locker size.
- The balance deduction must happen in the same transaction as completing the storage session and releasing the locker.
- Do not add payment providers, invoices, refunds, or transaction history unless explicitly approved later.
- Prefer not to add new entities for Stage 11; keep fixed MVP pricing simple unless a schema change is clearly justified and documented.
- Admin can still manually edit balance directly in the database for MVP testing.

## Locker Selection Rules

The backend must assign lockers based on requested luggage size:

- `S` can use `S`, `M`, `L`, `XL`.
- `M` can use `M`, `L`, `XL`.
- `L` can use `L`, `XL`.
- `XL` can use `XL`.

The backend must always assign the smallest available suitable locker.

Session creation must be transactional:

1. Find the smallest suitable `AVAILABLE` locker.
2. Create an `ACTIVE` storage session.
3. Mark the locker as `OCCUPIED`.

The implementation must use the real PostgreSQL database through `PrismaService`. Do not replace these flows with in-memory storage, static arrays, or mock data.

Finishing a session must be transactional:

1. Mark the session as `COMPLETED`.
2. Set `endedAt`.
3. Mark the locker as `AVAILABLE`.

## Docker Compose Rules

Docker Compose is the required deployment mechanism.

Rules:

- Do not bypass Docker Compose for VPS deployment.
- Do not require manual Node.js installation on the VPS.
- Do not require manual app builds on the VPS outside Docker.
- Keep service names stable and documented.
- Keep environment variables documented in `.env.example`, `README.md`, and `docs/deployment.md`.
- Update `docs/deployment.md` after every Docker or Nginx change.
- Keep production frontend base paths aligned with Nginx routes: `/tma/`, `/admin/`, and `/display/`.
- Do not require manual migrations outside Docker for VPS deployment; use the `api` container.

Services:

- `postgres`
- `api`
- `tma`
- `admin`
- `display`
- `nginx`

## Database Migration Rules

Use Prisma migrations for database schema changes.

Rules:

- Never change the database schema without a Prisma migration.
- Never edit production database structure manually as the primary deployment method.
- Keep seed data deterministic and documented.
- Seed test lockers for MVP development and demo environments.
- Update `docs/architecture.md`, `docs/deployment.md`, and `README.md` when schema, migration, or seed behavior changes.
- Do not add payment transaction tables in MVP.
- Keep `backend/api/prisma.config.ts`, `backend/api/prisma/schema.prisma`, migrations, seed scripts, and docs aligned.

## Environment Variable Rules

Rules:

- Never commit real `.env` files.
- Keep `.env.example` updated with placeholders for all required variables.
- Do not hardcode production secrets.
- Do not assume production secrets.
- Use `ADMIN_LOGIN`, `ADMIN_PASSWORD`, and `JWT_SECRET` for MVP admin authentication.
- Use `DATABASE_URL` for Prisma.
- Document every new required variable in `README.md` and `docs/deployment.md`.

## Admin Backend Rules

Admin authentication is an MVP-only env-based login.

Rules:

- Do not create an `AdminUser` table unless the user explicitly approves that scope change.
- Protect admin read/write endpoints with the JWT admin guard.
- Read users, sessions, lockers, and dashboard stats from PostgreSQL through `PrismaService`.
- Allow admin locker status changes only between `AVAILABLE` and `MAINTENANCE`.
- Do not allow admin requests to manually set a locker to `OCCUPIED`.
- Do not allow admin status changes on currently `OCCUPIED` lockers; occupied lockers are released by finishing active storage sessions.

## Telegram MiniApp Frontend Rules

The Telegram MiniApp lives in `apps/tma`.

Rules:

- Keep the TMA mobile-first and simple.
- Use the backend API for all user, balance, active session, history, start-session, and finish-session data.
- Do not add in-memory fake sessions or fake locker assignment logic in the frontend.
- Use `VITE_TMA_API_BASE_URL` for the frontend API base URL, defaulting to `/api`.
- Use `VITE_TMA_BASE_PATH` for the production Vite base path, defaulting to `/tma/` in Docker.
- Keep the current placeholder `telegramId` flow until Stage 10 implementation is explicitly requested.
- When Stage 10 is implemented, remove the production placeholder identity flow and authenticate through backend-validated Telegram `initData`.
- Document clearly that production Telegram `initData` validation is planned but not implemented yet until Stage 10 is completed.
- Do not add payments, QR codes, WebSockets, or complex state management in the TMA MVP.

## Admin Frontend Rules

The admin frontend lives in `apps/admin`.

Rules:

- Keep the admin UI desktop-friendly, simple, and operational.
- Use the Stage 4 admin API for login, dashboard, users, lockers, and sessions.
- Store the JWT in `localStorage` only for MVP.
- Use `VITE_ADMIN_API_BASE_URL` for the frontend API base URL, defaulting to `/api`.
- Use `VITE_ADMIN_BASE_PATH` for the production Vite base path, defaulting to `/admin/` in Docker.
- Do not implement advanced roles, permissions, or an `AdminUser` table.
- Do not allow manually setting lockers to `OCCUPIED`.
- Do not add payments, public display UI, Docker, Nginx, or complex state management as part of admin frontend work.

## Public Display Frontend Rules

The public display frontend lives in `apps/display`.

Rules:

- Keep the display read-only and unauthenticated.
- Use the Stage 3 public API for lockers and stats.
- Use `VITE_DISPLAY_API_BASE_URL` for the frontend API base URL, defaulting to `/api`.
- Use `VITE_DISPLAY_BASE_PATH` for the production Vite base path, defaulting to `/display/` in Docker.
- Use polling every few seconds for updates.
- Show locker code, size, and status.
- Clearly distinguish `AVAILABLE`, `OCCUPIED`, and `MAINTENANCE`.
- Do not add admin controls, payments, QR codes, WebSockets, Docker, Nginx, or complex state management as part of public display frontend work.

## Deployment Rules

VPS assumptions:

- Docker is installed.
- Docker Compose is installed.
- Git is installed.
- Environment variables are provided through `.env`.

Do not require:

- Manual Node.js installation.
- Manual npm install on the VPS host.
- Manual frontend builds on the VPS host.
- Manual database schema edits.

Production routing must support:

```txt
https://example.com/tma      -> Telegram MiniApp frontend
https://example.com/admin    -> Admin panel frontend
https://example.com/display  -> Public display frontend
https://example.com/api      -> Backend API
```

## Safe Change Rules

Before editing:

- Check repository status.
- Inspect relevant files.
- Avoid touching unrelated files.
- Do not revert changes you did not make.
- Keep changes small and aligned with existing architecture.

After editing:

- Run relevant checks when available.
- Update documentation.
- Summarize changed files.
- Explain any commands that could not be run.

## Library Documentation and Context7

When encountering errors, unclear behavior, version-specific APIs, dependency issues, framework conventions, or uncertainty about any library used in this project, agents may use the Context7 MCP tools to inspect current official library documentation before changing code.

Use Context7 especially for:

- NestJS APIs, modules, decorators, guards, providers, and configuration.
- Prisma schema, migrations, client usage, seeding, and transaction behavior.
- React, Vite, and TypeScript patterns when frontend stages begin.
- Nginx, Docker Compose, or deployment-related library/tool syntax when infrastructure stages begin.
- Any dependency error where installed package behavior may differ from remembered behavior.

Context7 usage rules:

- Prefer current library documentation over memory when debugging errors.
- Resolve the library ID first, then query the relevant docs.
- Keep queries focused on the concrete error, API, or version-specific behavior.
- Do not use documentation lookup as permission to expand MVP scope.
- If docs reveal that existing project documentation is stale, update the relevant project docs in the same change.
- Mention in the final report when Context7 materially informed a fix or design decision.

## Reporting Format After Each Change

When finishing a task, report:

1. What changed.
2. Which files were created or modified.
3. Which documentation files were updated.
4. Which checks were run.
5. Any known gaps or next steps.

For documentation-only changes, say explicitly that no backend/frontend logic was implemented.

## If Unsure

If unsure about architecture, scope, deployment, data model, or MVP boundaries, stop and propose a plan before editing.

Prefer simple, maintainable solutions over clever abstractions.
