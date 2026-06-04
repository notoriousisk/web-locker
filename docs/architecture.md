# Architecture

`locker-mvp` is an electronic luggage locker MVP. Users interact through a Telegram MiniApp, administrators use a web panel, and a public display page shows locker availability.

The system uses a simple monorepo with one backend API, three thin frontend apps, PostgreSQL persistence, Docker Compose deployment, and Nginx routing.

## System Overview

- Frontend: React + Vite + TypeScript.
- Backend: NestJS + TypeScript.
- Database: PostgreSQL.
- ORM: Prisma.
- Deployment: Docker Compose.
- Reverse proxy: Nginx.

The backend owns business logic:

- Telegram MiniApp `initData` validation and TMA JWT issuing.
- User profile and balance reads.
- Fixed locker pricing and balance deduction.
- Locker assignment.
- Storage session lifecycle.
- Admin authentication and admin operations.
- Public locker grid data.
- Structured logs, health checks, and lightweight metrics.

Frontend apps should stay thin and call backend APIs.

## Apps

### `apps/tma`

Telegram MiniApp for users.

- Reads raw `window.Telegram.WebApp.initData` inside Telegram.
- Authenticates through `POST /api/tma/auth/login`.
- Stores the returned TMA JWT in memory.
- Shows profile, balance, active sessions, and history.
- Starts storage by requested size `S`, `M`, `L`, or `XL`.
- Shows assigned locker code.
- Finishes active storage sessions.
- Uses `VITE_TMA_API_BASE_URL`, defaulting to `/api`.
- Uses `VITE_TMA_BASE_PATH`, defaulting to `/tma/` in Docker.

Local browser development without Telegram `initData` is available only when the backend has `TMA_DEV_AUTH_ENABLED=true`.

### `apps/admin`

Admin web panel.

- Uses env-based admin login.
- Stores the admin JWT in `localStorage` for MVP use.
- Shows dashboard stats, users, lockers, active sessions, and history.
- Allows locker status changes only between `AVAILABLE` and `MAINTENANCE`.
- Does not allow manually setting lockers to `OCCUPIED`.
- Uses `VITE_ADMIN_API_BASE_URL`, defaulting to `/api`.
- Uses `VITE_ADMIN_BASE_PATH`, defaulting to `/admin/` in Docker.

### `apps/display`

Unauthenticated public display.

- Shows locker code, size, and status.
- Distinguishes `AVAILABLE`, `OCCUPIED`, and `MAINTENANCE`.
- Shows public stats.
- Polls the public API every few seconds.
- Uses `VITE_DISPLAY_API_BASE_URL`, defaulting to `/api`.
- Uses `VITE_DISPLAY_BASE_PATH`, defaulting to `/display/` in Docker.

## Backend API

The NestJS API lives in `backend/api` and uses a global `/api` prefix.

Main modules:

- Prisma module: shared Prisma client.
- TMA auth module: Telegram `initData` validation and TMA JWT issuing.
- Users module: authenticated user profile and balance reads.
- Lockers module: locker listing.
- Sessions module: storage start, finish, active session, and history flows.
- Public module: unauthenticated locker grid and stats.
- Admin auth module: env-based admin login and JWT guard.
- Admin module: dashboard, users, lockers, sessions, and constrained locker status updates.
- Observability module: structured logs, health checks, and metrics.

Important endpoints:

```txt
POST /api/tma/auth/login
GET  /api/tma/me
GET  /api/tma/me/sessions/active
GET  /api/tma/me/sessions/history
POST /api/tma/sessions
POST /api/tma/sessions/:id/finish

GET  /api/public/lockers
GET  /api/public/stats

POST /api/admin/auth/login
GET  /api/admin/auth/me
GET  /api/admin/dashboard
GET  /api/admin/users
GET  /api/admin/lockers
PATCH /api/admin/lockers/:id/status
GET  /api/admin/sessions
GET  /api/admin/sessions/active
GET  /api/admin/sessions/history

GET  /api/health
GET  /api/health/db
GET  /api/metrics
```

## Data Model

### User

- `id`: UUID primary key.
- `telegramId`: unique Telegram user id.
- `username`
- `firstName`
- `lastName`
- `balance`: decimal.
- `createdAt`
- `updatedAt`

New TMA users start with balance `1000`. Existing balances remain unchanged until edited manually in PostgreSQL. There is no payment or transaction table in the MVP.

### Locker

- `id`: UUID primary key.
- `code`: unique locker code.
- `size`: `S | M | L | XL`.
- `status`: `AVAILABLE | OCCUPIED | MAINTENANCE`.
- `row`
- `column`
- `createdAt`
- `updatedAt`

`row` and `column` support the display grid and are unique together. Locker status and size are indexed for assignment.

### StorageSession

- `id`: UUID primary key.
- `userId`
- `lockerId`
- `requestedSize`: `S | M | L | XL`.
- `status`: `ACTIVE | COMPLETED`.
- `startedAt`
- `endedAt`
- `createdAt`
- `updatedAt`

A session starts as `ACTIVE`. A completed session has `endedAt`; finishing a session releases the locker.

## Migration and Seed

The Prisma schema is in:

```txt
backend/api/prisma/schema.prisma
```

Migration files live in:

```txt
backend/api/prisma/migrations/
```

The seed script is:

```txt
backend/api/prisma/seed.ts
```

Seed data upserts deterministic demo lockers:

```txt
A01 S   A02 S   A03 M   A04 M
B01 L   B02 L   B03 XL  B04 XL
```

Database schema changes must use Prisma migrations. Do not edit production database structure manually.

## Locker Assignment

Allowed locker sizes by requested luggage size:

```txt
S  -> S, M, L, XL
M  -> M, L, XL
L  -> L, XL
XL -> XL
```

The backend must assign the smallest available suitable locker.

Start session transaction:

1. Find a suitable `AVAILABLE` locker.
2. Check user balance against the assigned locker price.
3. Create an `ACTIVE` storage session.
4. Mark the locker `OCCUPIED`.

Finish session transaction:

1. Mark the storage session `COMPLETED`.
2. Set `endedAt`.
3. Deduct the assigned locker price.
4. Mark the locker `AVAILABLE`.

These flows must use Prisma and PostgreSQL, not in-memory state.

## Pricing

Fixed MVP prices:

```txt
S  = 5
M  = 7
L  = 10
XL = 15
```

Price is based on the assigned locker size, not the requested luggage size. If balance is insufficient, no session is created and no locker becomes occupied.

## Authentication

### Telegram MiniApp

The frontend sends raw `window.Telegram.WebApp.initData` to the backend. The backend validates it with `TELEGRAM_BOT_TOKEN`, checks freshness with `TMA_INIT_DATA_MAX_AGE_SECONDS`, creates or updates the user, and issues a short-lived TMA JWT signed with `TMA_JWT_SECRET`.

TMA user and session APIs must derive identity from that TMA JWT. The backend must not trust `initDataUnsafe`, editable `telegramId` fields, query parameters, or request-body identity fields for authentication.

Local browser development without Telegram data is allowed only through explicit backend demo mode:

```txt
TMA_DEV_AUTH_ENABLED=true
TMA_DEV_TELEGRAM_ID=1001
TMA_DEV_USERNAME=demo
TMA_DEV_FIRST_NAME=Demo
TMA_DEV_LAST_NAME=User
```

Keep demo auth disabled in production.

### Admin

Admin login uses environment variables:

```txt
ADMIN_LOGIN
ADMIN_PASSWORD
JWT_SECRET
```

Admin JWTs and TMA JWTs must remain separated by secret and token scope. Do not add an `AdminUser` table unless explicitly approved.

## Observability

Backend logs are structured JSON records written to stdout/stderr so `docker compose logs` remains the primary log viewer.

Logs include request ids, method, route, status code, latency, actor type, safe actor ids, and safe domain ids where available. Request and response bodies are not logged by default.

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

Health endpoints:

```txt
GET /api/health
GET /api/health/db
```

Metrics endpoint:

```txt
GET /api/metrics
```

Metrics are lightweight API counters plus database-backed gauges in Prometheus text format. Do not add a required external observability platform unless explicitly approved.

## Infrastructure

Docker Compose services:

- `postgres`
- `api`
- `tma`
- `admin`
- `display`
- `nginx`

Nginx routes:

```txt
/api      -> api
/tma      -> tma
/admin    -> admin
/display  -> display
```

The VPS deployment path must stay containerized and must not require host Node.js, host npm installs, manual frontend builds, or manual database schema edits.

Current demo deployment is served from the VPS over HTTP:

```txt
http://157.22.199.163/display/
http://157.22.199.163/admin/
```

Telegram MiniApp testing uses the Telegram Test Server Environment bot while the deployment remains HTTP-only, because the main Telegram environment requires HTTPS MiniApp URLs.

## MVP Exclusions

Do not add without explicit approval:

- Real payments, payment providers, invoices, refunds, or transaction history.
- Physical locker integration.
- WebSockets.
- Multiple locker locations.
- QR codes.
- 3D visualization.
- Real baggage dimension input.
- Complex admin roles or permissions.
- Event sourcing, CQRS, microservices, queues, or Kubernetes.
- External managed services required for core MVP operation.
