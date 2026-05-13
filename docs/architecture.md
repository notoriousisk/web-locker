# Architecture

`locker-mvp` is an MVP for an electronic luggage locker system. Users interact through a Telegram MiniApp, administrators manage system state through a web panel, and a public display page shows locker availability.

This document describes the planned architecture and current implementation. The repository has completed Stage 10: full Telegram MiniApp authentication with backend-validated Telegram `initData`. Stage 11 is planned next as documentation-only future work. The NestJS backend exists under `backend/api`, the user-facing Telegram MiniApp frontend exists under `apps/tma`, the admin frontend exists under `apps/admin`, the public display frontend exists under `apps/display`, Docker Compose/Nginx deployment files exist under `infra`, and helper scripts exist under `scripts`.

## System Overview

Planned stack:

- Frontend: React + Vite + TypeScript.
- Backend: NestJS + TypeScript.
- Database: PostgreSQL.
- ORM: Prisma.
- Deployment: Docker Compose.
- Reverse proxy: Nginx.

The backend API owns business logic:

- User profile persistence.
- Balance reads.
- Telegram MiniApp `initData` validation and TMA JWT authentication.
- Locker assignment.
- Storage session lifecycle.
- Admin authentication.
- Admin locker/session/user operations.
- Public locker grid data.

Frontend apps should be thin clients that call backend APIs.

## Apps and Responsibilities

### Telegram MiniApp: `apps/tma`

Responsibilities:

- Load or upsert Telegram user profile.
- Show user profile data.
- Show user balance.
- Show active storage sessions.
- Show storage history.
- Let the user start a storage session by selecting `S`, `M`, `L`, or `XL`.
- Show assigned locker code.
- Let the user finish an active storage session.

Current Stage 5 contents:

- React + Vite + TypeScript app.
- Mobile-first user interface.
- Profile and balance view.
- Active sessions view.
- History sessions view.
- Start storage flow with `S`, `M`, `L`, and `XL` size selection.
- Assigned locker confirmation after starting storage.
- Finish storage action for active sessions.
- Vite dev proxy from `/api` to `http://localhost:3000`.
- API base URL read from `VITE_TMA_API_BASE_URL`, defaulting to `/api`.

Current Stage 10 contents:

- Reads raw `window.Telegram.WebApp.initData` when opened inside Telegram.
- Sends raw `initData` to the backend for validation.
- Stores the returned short-lived TMA JWT in React memory only.
- Sends `Authorization: Bearer <tma-token>` to user and session endpoints.
- No editable production `telegramId` flow.
- Local browser development without Telegram `initData` is available only through explicit backend `TMA_DEV_AUTH_ENABLED=true`.

### Admin Web Panel: `apps/admin`

Responsibilities:

- Admin login with simple MVP credentials.
- Dashboard with basic stats.
- View all lockers.
- View locker statuses.
- Change locker status between `AVAILABLE` and `MAINTENANCE`.
- View active sessions.
- View users.

Current Stage 6 contents:

- React + Vite + TypeScript app.
- Desktop-friendly admin UI.
- Login screen.
- JWT stored in `localStorage` for MVP.
- Dashboard stats.
- Lockers management page.
- Users page.
- Sessions page with active, history, and all views.
- Locker status updates only between `AVAILABLE` and `MAINTENANCE`.
- API base URL read from `VITE_ADMIN_API_BASE_URL`, defaulting to `/api`.

### Public Display Page: `apps/display`

Responsibilities:

- Show all lockers in a visual grid.
- Show locker code and size.
- Show locker status as `AVAILABLE`, `OCCUPIED`, or `MAINTENANCE`.
- Show basic public stats.
- Poll the backend every few seconds.
- Require no authentication.

Current Stage 7 contents:

- React + Vite + TypeScript app.
- Responsive read-only public display UI.
- Locker grid with code, size, and status.
- Public stats summary.
- Clear visual styling for `AVAILABLE`, `OCCUPIED`, and `MAINTENANCE`.
- Polling every 5 seconds.
- Vite dev proxy from `/api` to `http://localhost:3000`.
- API base URL read from `VITE_DISPLAY_API_BASE_URL`, defaulting to `/api`.

### Backend API: `backend/api`

Responsibilities:

- Provide API endpoints for all frontend apps.
- Enforce business rules.
- Persist data through Prisma and PostgreSQL.
- Run database migrations and seed test lockers.

Current backend contents:

- Minimal NestJS application scaffold.
- Global `/api` prefix.
- `GET /api/health` health endpoint.
- Global `ConfigModule` reading `backend/api/.env` or root `.env`.
- Global `PrismaModule` and `PrismaService`.
- Shared TypeScript enums for locker size, locker status, and session status.
- Prisma schema, initial migration, and deterministic seed script.
- TMA auth module for backend validation of raw Telegram `initData`, user upsert, and short-lived TMA JWT issuing.
- Users module for authenticated TMA profile reads.
- Lockers module for DB-backed locker listing.
- Sessions module for DB-backed active/history reads, start-session flow, and finish-session flow.
- Public module for unauthenticated locker grid data and basic stats.
- Admin backend with env-based login, JWT guard, dashboard stats, user/session reads, locker reads, and constrained locker maintenance status updates.
- TMA user/session endpoints use the TMA JWT identity instead of trusting client-supplied `telegramId`.

Planned Stage 11 backend change:

- Add fixed MVP locker prices.
- Check user balance before occupying the assigned locker.
- Deduct the assigned locker price when finishing a session in the same transaction that releases the locker.

### Infrastructure: `infra`

Responsibilities:

- Define Docker Compose services.
- Define Nginx routing.
- Support VPS deployment without manual Node.js installation.

Current Stage 8 contents:

- `infra/docker-compose.yml` defines `postgres`, `api`, `tma`, `admin`, `display`, and `nginx` services.
- `postgres` uses a persistent `postgres_data` volume.
- `api` builds from `backend/api/Dockerfile`, connects to PostgreSQL through `DATABASE_URL`, and runs `prisma migrate deploy` before starting NestJS.
- `tma`, `admin`, and `display` build static Vite assets and serve them through app-local Nginx containers.
- `infra/nginx/nginx.conf` is the public reverse proxy.
- Public routing maps `/api` to the API, `/tma` to the Telegram MiniApp, `/admin` to the admin frontend, and `/display` to the public display frontend.
- Frontend Docker builds pass Vite base paths for their route prefixes: `/tma/`, `/admin/`, and `/display/`.

## Planned Backend Modules

### Prisma Module

- Provides a shared Prisma client.
- Owns database access setup.
- Supports migrations and seed data.
- Implemented in Stage 2 as `src/prisma/prisma.module.ts` and `src/prisma/prisma.service.ts`.

### Users Module

- Upserts Telegram MiniApp users.
- Returns current user profile and balance.
- Returns user active sessions and history.
- Implemented in Stage 3 for user upsert and profile reads. Session listing is implemented in the Sessions module.

### Lockers Module

- Lists lockers.
- Provides admin locker management.
- Enforces locker status rules.
- Implemented in Stage 3 for DB-backed locker listing. Admin status management was added in Stage 4.

### Sessions Module

- Starts storage sessions.
- Finishes storage sessions.
- Implements transactional locker assignment.
- Implements transactional locker release.
- Implemented in Stage 3 using `PrismaService` and real PostgreSQL-backed transactions.

### Auth Module

- Handles admin login.
- Issues JWTs.
- Protects admin endpoints.
- Implemented in Stage 4 as env-based admin login using `ADMIN_LOGIN`, `ADMIN_PASSWORD`, and `JWT_SECRET`.

### Admin Module

- Provides dashboard stats.
- Lists users.
- Lists sessions.
- Exposes admin locker operations.
- Implemented in Stage 4 using real PostgreSQL reads through `PrismaService`.
- Admin locker status updates allow only `AVAILABLE` and `MAINTENANCE`.
- Currently `OCCUPIED` lockers cannot be changed manually from admin endpoints.

### Public Module

- Exposes public locker grid data for the display page.
- Exposes basic public stats.
- Implemented in Stage 3 as read-only endpoints.

## Data Model

### User

Fields:

- `id`: UUID string primary key.
- `telegramId`: unique string.
- `username`
- `firstName`
- `lastName`
- `balance`: decimal, default `0`, precision `12,2`.
- `createdAt`
- `updatedAt`

Rules:

- `telegramId` must be unique.
- Until Stage 11 is implemented, `balance` is only a numeric field.
- Stage 11 is planned to make new users start with balance `1000`.
- Stage 11 must keep admin balance edits as direct database edits for MVP testing.
- No payment transaction model exists in MVP.

### Locker

Fields:

- `id`: UUID string primary key.
- `code`: unique string.
- `size`: `S | M | L | XL`
- `status`: `AVAILABLE | OCCUPIED | MAINTENANCE`
- `row`
- `column`
- `createdAt`
- `updatedAt`

Rules:

- `code` must be unique.
- `row` and `column` support public display layout.
- `row` and `column` are unique together.
- `status` and `size` are indexed together for locker selection.
- Only `AVAILABLE` lockers can be assigned to new sessions.

### StorageSession

Fields:

- `id`: UUID string primary key.
- `userId`
- `lockerId`
- `requestedSize`: `S | M | L | XL`
- `status`: `ACTIVE | COMPLETED`
- `startedAt`
- `endedAt`
- `createdAt`
- `updatedAt`

Rules:

- A session starts as `ACTIVE`.
- A completed session has `endedAt`.
- Finishing a session releases the locker.
- `userId/status`, `lockerId/status`, and `status/startedAt` are indexed for MVP queries.

## Current Migration and Seed

The initial migration is:

```txt
backend/api/prisma/migrations/20260501000000_init/migration.sql
```

It creates:

- `LockerSize`, `LockerStatus`, and `SessionStatus` PostgreSQL enums.
- `users` table.
- `lockers` table.
- `storage_sessions` table.
- Required unique constraints, indexes, and foreign keys.

The seed script is:

```txt
backend/api/prisma/seed.ts
```

It upserts deterministic test lockers:

```txt
A01 S   A02 S   A03 M   A04 M
B01 L   B02 L   B03 XL  B04 XL
```

### Optional AdminUser

For MVP, an `AdminUser` entity is not planned initially.

Admin credentials should come from environment variables:

```txt
ADMIN_LOGIN=admin
ADMIN_PASSWORD=change-me
JWT_SECRET=change-me
```

## Locker Selection Logic

When a user starts storage, they select a requested luggage size.

Allowed locker sizes:

```txt
S  -> S, M, L, XL
M  -> M, L, XL
L  -> L, XL
XL -> XL
```

The backend must assign the smallest available suitable locker.

Example:

If the user requests `M` and no `M` locker is available, assign an available `L` locker before considering `XL`.

The start-session operation must run in a transaction:

1. Find the smallest suitable `AVAILABLE` locker.
2. Create an `ACTIVE` storage session.
3. Mark the locker as `OCCUPIED`.

Current implementation detail:

- The sessions service checks suitable sizes in the required order.
- For each size, it searches available lockers ordered by `row`, `column`, then `code`.
- It uses a conditional `updateMany` on the selected locker with `status = AVAILABLE` before creating the session.
- If another request took the same locker first, the service retries the same size before moving to the next suitable size.

The finish-session operation must run in a transaction:

1. Mark the storage session as `COMPLETED`.
2. Set `endedAt`.
3. Mark the locker as `AVAILABLE`.

Current implementation verifies the active session belongs to the authenticated internal `userId` from the TMA JWT before releasing the locker.

## Stage 10 Telegram Authentication

Stage 10 replaces the placeholder `telegramId` flow with production-oriented Telegram MiniApp authentication.

Implemented flow:

1. Telegram opens the TMA and provides `window.Telegram.WebApp.initData`.
2. The frontend sends the raw `initData` string to the backend.
3. The backend validates the Telegram signature cryptographically using the Telegram bot token.
4. The backend rejects invalid, missing, expired, or tampered `initData` in production mode.
5. The backend creates or updates the user profile only after validation succeeds.
6. The backend issues a short-lived TMA JWT containing the internal `userId` and Telegram identity.
7. The TMA sends the token as `Authorization: Bearer <token>` to user/session APIs.
8. User, balance, active-session, history, start-session, and finish-session endpoints use the authenticated token identity instead of request-provided `telegramId`.

Security notes:

- `initDataUnsafe` must not be trusted for authentication or authorization because it is client-provided parsed data.
- The raw `initData` must be validated on the backend before any user identity is accepted.
- A Telegram bot token becomes a backend secret and must never be exposed to frontend builds.
- The TMA JWT should be scoped to TMA user APIs and should not be accepted by admin guards.
- The TMA stores the token in memory and re-authenticates from Telegram `initData` on app load.
- The implementation checks Telegram `auth_date` freshness with `TMA_INIT_DATA_MAX_AGE_SECONDS`, defaulting to 86400 seconds.
- HTTPS is required for real Telegram MiniApp production use; this repository currently documents HTTP container routing with TLS termination expected outside the stack unless direct TLS is added later.

Local development assumptions:

- Local browser development often has no Telegram `initData`.
- Stage 10 provides explicit local development mode through backend `TMA_DEV_AUTH_ENABLED=true` and identity variables `TMA_DEV_TELEGRAM_ID`, `TMA_DEV_USERNAME`, `TMA_DEV_FIRST_NAME`, and `TMA_DEV_LAST_NAME`.
- Production builds do not silently fall back to editable `telegramId`.

Stage 10 environment variables:

- `TELEGRAM_BOT_TOKEN`
- `TMA_JWT_SECRET`
- `TMA_JWT_EXPIRES_IN`
- `TMA_INIT_DATA_MAX_AGE_SECONDS`
- `TMA_DEV_AUTH_ENABLED`
- `TMA_DEV_TELEGRAM_ID`
- `TMA_DEV_USERNAME`
- `TMA_DEV_FIRST_NAME`
- `TMA_DEV_LAST_NAME`

## Planned Stage 11 Balance and Pricing

Stage 11 will add simple fixed balance and pricing behavior without real payments.

Pricing rules:

```txt
S  = 5
M  = 7
L  = 10
XL = 15
```

Rules:

- New users start with balance `1000`.
- Price is based on the assigned locker size, not the requested luggage size.
- Example: if a user requests `M` and the backend assigns an `L` locker, the cost is `10`.
- Start-session must select the smallest suitable available locker, determine its price, then check the user's balance before occupying the locker.
- If the user has insufficient balance, the transaction must not create an active session and must not mark any locker as `OCCUPIED`.
- Finish-session must deduct the assigned locker price in the same transaction that marks the session `COMPLETED`, sets `endedAt`, and marks the locker `AVAILABLE`.
- Admin can still manually edit `User.balance` directly in PostgreSQL for MVP testing.

MVP exclusions:

- No payment providers.
- No invoices.
- No refunds.
- No transaction history by default.
- No payment transaction tables unless explicitly approved later.

## Current Backend Endpoints

```txt
GET  /api/health

POST /api/tma/auth/login
GET  /api/tma/me
GET  /api/tma/me/sessions/active
GET  /api/tma/me/sessions/history
POST /api/tma/sessions
POST /api/tma/sessions/:id/finish

GET  /api/lockers

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
```

All TMA, Stage 3, and Stage 4 business endpoints use `PrismaService` and the real PostgreSQL database. No in-memory storage or mock repositories are used.

## Current TMA Backend Integration

The Stage 10 TMA calls these backend endpoints:

```txt
POST /api/tma/auth/login
GET  /api/tma/me
GET  /api/tma/me/sessions/active
GET  /api/tma/me/sessions/history
POST /api/tma/sessions
POST /api/tma/sessions/:id/finish
```

After login, the frontend sends the TMA JWT as `Authorization: Bearer <tma-token>`. It does not implement locker assignment locally. It sends the requested luggage size to the backend and displays the assigned locker returned by the API.

## Current Admin Frontend Integration

The Stage 6 admin frontend calls these backend endpoints:

```txt
POST /api/admin/auth/login
GET  /api/admin/auth/me
GET  /api/admin/dashboard
GET  /api/admin/users
GET  /api/admin/lockers
PATCH /api/admin/lockers/:id/status
GET  /api/admin/sessions
GET  /api/admin/sessions/active
GET  /api/admin/sessions/history
```

The frontend does not implement locker status rules locally beyond hiding invalid `OCCUPIED` updates in the UI. The backend remains authoritative and rejects invalid status changes.

## User Flow

### Start Storage

1. User opens Telegram MiniApp.
2. Stage 10 flow sends raw Telegram `initData` and creates or updates the user only after backend validation succeeds.
3. Backend returns a short-lived TMA JWT for user/session APIs.
4. User selects luggage size: `S`, `M`, `L`, or `XL`.
5. Frontend sends selected size to backend with the TMA JWT.
6. Backend finds the smallest suitable available locker.
7. Planned Stage 11 flow checks balance against the assigned locker size price.
8. Backend creates an active storage session.
9. Backend marks the locker as `OCCUPIED`.
10. User sees the assigned locker code.

### Finish Storage

1. User opens active storage session.
2. User clicks finish or take luggage.
3. Backend marks the session as `COMPLETED`.
4. Backend sets `endedAt`.
5. Planned Stage 11 flow deducts the assigned locker size price in the same transaction.
6. Backend marks the locker as `AVAILABLE`.
7. User no longer sees the session as active.

## Admin Flow

1. Admin opens `/admin`.
2. Admin logs in using `ADMIN_LOGIN` and `ADMIN_PASSWORD`.
3. Backend issues an 8-hour JWT signed with `JWT_SECRET`.
4. Admin views dashboard stats.
5. Admin views users, active sessions, and lockers.
6. Admin may change an unused locker between `AVAILABLE` and `MAINTENANCE`.

For MVP, admin authentication is intentionally simple and environment-variable based.

## Public Display Flow

1. Public display opens `/display`.
2. Display app calls public locker endpoint.
3. Display app renders lockers in a grid using `row` and `column`.
4. Display app shows each locker status.
5. Display app polls every few seconds.

No authentication is required for the public display page.

## MVP Limitations

The MVP intentionally excludes:

- Real payments.
- Payment providers.
- Invoices.
- Refunds.
- Transaction history by default.
- Physical locker integration.
- WebSockets.
- Complex analytics.
- Multiple locker locations.
- QR codes.
- 3D visualization.
- Real baggage dimension input.
- Complex admin roles.

Updated planned limitations:

- Stage 10 adds Telegram `initData` validation but does not add complex auth roles, external managed auth services, or a Telegram bot command backend.
- Stage 11 adds balance deduction but does not add payment providers, invoices, refunds, or transaction history.

These limitations keep the first version small, deployable, and testable.
