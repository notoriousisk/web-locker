# MVP Plan

This document tracks current MVP scope, priorities, assumptions, and acceptance criteria for `locker-mvp`.

Update this file whenever scope, priorities, assumptions, acceptance criteria, or MVP boundaries change.

## Current Scope

The MVP includes:

- Telegram MiniApp for users.
- Admin web panel.
- Public locker display.
- NestJS backend API.
- PostgreSQL persistence through Prisma.
- Docker Compose deployment.
- Nginx routing.
- Backend-validated Telegram MiniApp authentication.
- Env-based admin authentication.
- Fixed locker pricing and balance deduction.
- Structured logs, health checks, and lightweight metrics.

The MVP excludes unless explicitly approved:

- Real payments, payment providers, invoices, refunds, or transaction history.
- Physical locker integration.
- WebSockets.
- Multiple locker locations.
- QR codes.
- 3D visualization.
- Real baggage dimension input.
- Complex admin roles or permissions.
- Event sourcing, CQRS, microservices, message queues, or Kubernetes.
- Required external managed services.
- Large observability platforms.

## Architecture

- `apps/tma`: Telegram MiniApp frontend.
- `apps/admin`: Admin web panel.
- `apps/display`: Public display page.
- `backend/api`: NestJS backend API.
- `infra`: Docker Compose and Nginx configuration.
- `docs`: project documentation.

Stack:

- Frontend: React + Vite + TypeScript.
- Backend: NestJS + TypeScript.
- Database: PostgreSQL.
- ORM: Prisma.
- Deployment: Docker Compose.
- Reverse proxy: Nginx.

Backend owns business logic. Frontends call APIs and avoid duplicating locker assignment, pricing, auth, or persistence rules.

## Data Model

### User

- `id`
- `telegramId`
- `username`
- `firstName`
- `lastName`
- `balance`
- `createdAt`
- `updatedAt`

Rules:

- `telegramId` is unique.
- New users start with balance `1000`.
- Existing user balances remain unchanged until manually edited.
- No payment or transaction table exists in the MVP.

### Locker

- `id`
- `code`
- `size`: `S | M | L | XL`
- `status`: `AVAILABLE | OCCUPIED | MAINTENANCE`
- `row`
- `column`
- `createdAt`
- `updatedAt`

Rules:

- `code` is unique.
- `row` and `column` support public display layout.
- Only `AVAILABLE` lockers can be assigned.

### StorageSession

- `id`
- `userId`
- `lockerId`
- `requestedSize`: `S | M | L | XL`
- `status`: `ACTIVE | COMPLETED`
- `startedAt`
- `endedAt`
- `createdAt`
- `updatedAt`

Rules:

- Starting storage creates an `ACTIVE` session.
- Finishing storage marks the session `COMPLETED`, sets `endedAt`, releases the locker, and deducts balance.

## Backend Modules

- Prisma module: shared database access.
- TMA auth module: Telegram `initData` validation and TMA JWT issuing.
- Users module: authenticated user profile and balance.
- Lockers module: locker reads.
- Sessions module: session lifecycle, assignment, pricing, and balance deduction.
- Public module: unauthenticated locker grid and stats.
- Admin auth module: env-based login and JWT guard.
- Admin module: dashboard, users, lockers, and sessions.
- Observability support: structured logs, error logging, health checks, and metrics.

## API Surface

TMA endpoints:

```txt
POST /api/tma/auth/login
GET  /api/tma/me
GET  /api/tma/me/sessions/active
GET  /api/tma/me/sessions/history
POST /api/tma/sessions
POST /api/tma/sessions/:id/finish
```

Public endpoints:

```txt
GET /api/public/lockers
GET /api/public/stats
```

Admin endpoints:

```txt
POST  /api/admin/auth/login
GET   /api/admin/auth/me
GET   /api/admin/dashboard
GET   /api/admin/users
GET   /api/admin/lockers
PATCH /api/admin/lockers/:id/status
GET   /api/admin/sessions
GET   /api/admin/sessions/active
GET   /api/admin/sessions/history
```

Operational endpoints:

```txt
GET /api/health
GET /api/health/db
GET /api/metrics
```

## Business Rules

Locker suitability:

```txt
S  -> S, M, L, XL
M  -> M, L, XL
L  -> L, XL
XL -> XL
```

The backend assigns the smallest available suitable locker.

Start storage:

1. Find a suitable `AVAILABLE` locker.
2. Check the user has enough balance for the assigned locker size.
3. Create an `ACTIVE` session.
4. Mark the locker `OCCUPIED`.

Finish storage:

1. Mark the session `COMPLETED`.
2. Set `endedAt`.
3. Deduct the assigned locker price.
4. Mark the locker `AVAILABLE`.

Fixed prices:

```txt
S  = 5
M  = 7
L  = 10
XL = 15
```

Price is based on assigned locker size. If balance is insufficient, no session is created and no locker becomes occupied.

## Auth Rules

### Telegram MiniApp

- The frontend sends raw `window.Telegram.WebApp.initData` to the backend.
- The backend validates `initData` cryptographically with `TELEGRAM_BOT_TOKEN`.
- The backend checks `auth_date` freshness with `TMA_INIT_DATA_MAX_AGE_SECONDS`.
- The backend creates or updates a user only after validation succeeds.
- The backend issues a short-lived TMA JWT signed with `TMA_JWT_SECRET`.
- TMA user and session endpoints derive identity from the TMA JWT.
- The backend must not trust `initDataUnsafe`, editable `telegramId`, query parameters, or request-body identity fields for auth.
- Local browser demo auth is allowed only with explicit `TMA_DEV_AUTH_ENABLED=true`.

### Admin

- Admin auth uses `ADMIN_LOGIN`, `ADMIN_PASSWORD`, and `JWT_SECRET`.
- Admin JWTs and TMA JWTs must stay separated by secret and scope.
- Do not add an `AdminUser` table unless explicitly approved.

## Frontend Rules

### `apps/tma`

- Mobile-first.
- Uses backend APIs for user, balance, sessions, start storage, and finish storage.
- Does not use fake sessions or frontend locker assignment logic.
- Uses `VITE_TMA_API_BASE_URL` and `VITE_TMA_BASE_PATH`.
- Does not add payments, QR codes, WebSockets, or complex state management.

### `apps/admin`

- Desktop-friendly and operational.
- Uses admin APIs for login, dashboard, users, lockers, and sessions.
- Stores JWT in `localStorage` for MVP use.
- Allows only `AVAILABLE` and `MAINTENANCE` locker status changes.
- Does not manually set lockers to `OCCUPIED`.
- Does not add roles, payments, or complex state management.

### `apps/display`

- Read-only and unauthenticated.
- Uses public APIs for lockers and stats.
- Polls every few seconds.
- Shows locker code, size, and status.
- Does not add admin controls, payments, QR codes, or WebSockets.

## Deployment Rules

- Docker Compose is the required deployment path.
- Do not require host Node.js, host npm installs, manual frontend builds, or manual database edits on the VPS.
- Keep services stable: `postgres`, `api`, `tma`, `admin`, `display`, `nginx`.
- Keep routes stable: `/api`, `/tma`, `/admin`, `/display`.
- The `api` container runs migrations.
- Docker health check uses `GET /api/health/db`.
- Keep `.env.example`, `README.md`, and `docs/deployment.md` aligned for env changes.
- Current VPS demo access is HTTP at `http://157.22.199.163/display/` and `http://157.22.199.163/admin/`.
- Telegram MiniApp testing uses the Telegram Test Server Environment bot while the VPS deployment remains HTTP-only, because the main Telegram environment requires HTTPS MiniApp URLs.

## Observability Rules

- Backend logs are structured JSON to stdout/stderr.
- `docker compose logs` is the primary log viewer.
- Request logs include method, route, status code, latency, request id, and safe actor context.
- Error logs include safe context and useful stack traces.
- Audit-relevant logs cover admin auth, admin locker changes, TMA auth, auth failures, public API failures, storage starts, failed starts, insufficient balance, session finish, locker release, and balance deduction.
- `GET /api/health` checks API liveness.
- `GET /api/health/db` checks database connectivity.
- `GET /api/metrics` exposes lightweight Prometheus-compatible metrics.

Never log:

- `TELEGRAM_BOT_TOKEN`
- `JWT_SECRET`
- `TMA_JWT_SECRET`
- raw Telegram `initData`
- `Authorization` headers
- passwords
- database passwords
- full JWTs
- full database connection strings

## Acceptance Criteria

- Core flows use real PostgreSQL through Prisma.
- TMA auth requires backend-validated Telegram `initData` in production.
- Admin routes are JWT-protected.
- Admin cannot manually set lockers to `OCCUPIED`.
- Locker assignment always picks the smallest suitable available locker.
- Session start and finish flows are transactional.
- Balance deduction happens only when storage is finished.
- Insufficient balance prevents session creation and locker occupation.
- Docker Compose can build and run the full stack.
- Nginx routes `/api`, `/tma`, `/admin`, and `/display`.
- Health and metrics endpoints respond.
- Logs avoid secrets and sensitive values.

## Documentation Maintenance

Documentation is part of project state.

Update:

- `README.md` for setup, commands, env vars, or structure.
- `docs/architecture.md` for modules, flows, data model, or responsibilities.
- `docs/deployment.md` for Docker, Nginx, env vars, migrations, logs, backup, or restore.
- `docs/implementation-plan.md` for scope, priorities, assumptions, or acceptance criteria.
- `AGENTS.md` when future-agent rules change.
