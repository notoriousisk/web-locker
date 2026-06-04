# AGENTS.md

Mandatory rules for future AI coding agents working on `locker-mvp`.

## Project State
The MVP includes production-oriented observability. Main paths: `backend/api` NestJS API, `apps/tma` Telegram MiniApp, `apps/admin` admin panel, `apps/display` public display, `infra` Docker/Nginx, and `docs` project docs.

## Read Before Editing
Before any code, configuration, schema, Docker, deployment, or documentation change, read:

1. `README.md`
2. `AGENTS.md`
3. `docs/architecture.md`
4. `docs/deployment.md`
5. `docs/implementation-plan.md`

If any are missing, repair the documentation before continuing.

## Working Rules
- Check git status before editing.
- Inspect relevant files and understand the current architecture first.
- Keep changes small and aligned with the existing MVP.
- Do not revert changes you did not make.
- If a request is ambiguous, propose a plan before editing.
- After implementation, config, schema, Docker, deployment, or behavior changes, update docs in the same task.
- Docs: `README.md` for setup/env/commands/structure; `docs/architecture.md` for modules/flows/data; `docs/deployment.md` for Docker/Nginx/env/migrations/logs/backup; `docs/implementation-plan.md` for scope/priorities/assumptions; `AGENTS.md` for future-agent rules.

## Architecture
- Frontend: React + Vite + TypeScript.
- Backend: NestJS + TypeScript.
- Database: PostgreSQL.
- ORM: Prisma.
- Deployment: Docker Compose.
- Reverse proxy: Nginx.
- Keep business logic in `backend/api`; keep frontends thin.

Required production routes: `/tma`, `/admin`, `/display`, `/api`. Docker Compose services must remain stable: `postgres`, `api`, `tma`, `admin`, `display`, `nginx`.

## MVP Boundaries
Allowed MVP scope: TMA profile/balance/sessions/history, start and finish storage, admin login/dashboard/users/lockers/sessions, admin locker maintenance status changes, public locker display, PostgreSQL persistence, Prisma migrations/seed, Docker Compose/Nginx deployment, Telegram `initData` auth, fixed balance pricing, structured logs, health checks, and `/api/metrics`.

Do not add without explicit approval: real payments, payment providers, invoices, refunds, transaction history, physical locker integration, WebSockets, complex analytics, external observability platforms, multiple locations, QR codes, 3D views, real baggage dimensions, complex admin roles, CQRS/event sourcing, microservices, Kubernetes, queues, or external managed services required for the MVP.

## Core Business Rules
- Locker suitability: `S -> S/M/L/XL`, `M -> M/L/XL`, `L -> L/XL`, `XL -> XL`.
- Assign the smallest available suitable locker.
- Start session transaction: find `AVAILABLE` locker, create `ACTIVE` session, mark locker `OCCUPIED`.
- Finish session transaction: mark session `COMPLETED`, set `endedAt`, mark locker `AVAILABLE`, deduct balance.
- Use Prisma/PostgreSQL for these flows; never replace them with in-memory or mock state.
- New users start with balance `1000`.
- Prices: `S = 5`, `M = 7`, `L = 10`, `XL = 15`.
- Price is based on assigned locker size, not requested luggage size.
- If balance is insufficient, do not create a session or occupy a locker.

## Auth, Env, and Secrets
- TMA auth must use backend-validated raw Telegram `initData`; never trust `initDataUnsafe` for auth.
- TMA APIs must derive identity from the TMA JWT.
- Keep admin JWTs and TMA JWTs separate by secret and scope.
- Local browser TMA auth is allowed only with explicit `TMA_DEV_AUTH_ENABLED=true`.
- Never expose `TELEGRAM_BOT_TOKEN` through frontend `VITE_` variables.
- Never commit real `.env` files or hardcode production secrets.
- Keep `.env.example`, `README.md`, and `docs/deployment.md` aligned for env changes.
- Never log secrets, raw Telegram `initData`, `Authorization` headers, passwords, full JWTs, database passwords, or full DB URLs.

## Admin and Frontend Rules
- Admin auth is env-based; do not add `AdminUser` unless explicitly approved.
- Admin locker status changes may only use `AVAILABLE` and `MAINTENANCE`.
- Admin must not manually set `OCCUPIED` or change occupied lockers.
- `apps/tma`, `apps/admin`, and `apps/display` must use backend APIs and their documented `VITE_*_API_BASE_URL` and base path variables.
- Public display stays read-only, unauthenticated, and polling-based.

## Database and Deployment
- Use Prisma migrations for every schema change.
- Do not manually edit production DB structure as the deployment path.
- Keep seed data deterministic and documented.
- VPS deployment must use Docker Compose and must not require host Node.js/npm/manual builds.
- The `api` container runs migrations; Docker health check uses `GET /api/health/db`.

## Finish Report
After a task, report what changed, files modified, docs updated, checks run, and any gaps. For documentation-only tasks, say no backend/frontend logic was implemented.
