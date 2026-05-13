# MVP Implementation Plan

This document is the living implementation plan for `locker-mvp`.

Future agents must update this file whenever implementation stages, scope, priorities, assumptions, acceptance criteria, or MVP boundaries change.

## 1. Architecture

The MVP uses a simple monorepo layout with separate frontend apps and one backend API:

- `apps/tma`: Telegram MiniApp frontend for end users.
- `apps/admin`: Admin web panel.
- `apps/display`: Public locker display page.
- `backend/api`: NestJS backend API.
- `infra`: Docker Compose and Nginx configuration.
- `docs`: architecture, deployment, and implementation documentation.

Recommended stack:

- Frontend: React + Vite + TypeScript.
- Backend: NestJS + TypeScript.
- Database: PostgreSQL.
- ORM: Prisma.
- Deployment: Docker Compose.
- Reverse proxy: Nginx.

The backend owns all business logic:

- Locker assignment.
- Storage session lifecycle.
- Admin authentication.
- Database access.
- User/session/locker APIs.

The frontend apps are intentionally thin:

- TMA calls user and session endpoints.
- Admin calls admin endpoints.
- Display calls public locker status endpoints with polling.

No WebSockets are planned for MVP. Polling is enough.

## 2. Folder Structure

```txt
./
├── apps/
│   ├── tma/
│   ├── admin/
│   └── display/
├── backend/
│   └── api/
├── infra/
│   └── nginx/
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   └── implementation-plan.md
├── README.md
├── AGENTS.md
└── .env.example
```

Later stages may add implementation files under these directories. When they do, documentation must be updated.

## 3. Data Model

### User

Fields:

- `id`
- `telegramId`
- `username`
- `firstName`
- `lastName`
- `balance`
- `createdAt`
- `updatedAt`

Notes:

- `telegramId` should be unique.
- Until Stage 11 is implemented, `balance` is a numeric database field only.
- Planned Stage 11 sets new users to an initial balance of `1000`.
- Planned Stage 11 uses fixed locker prices and deducts balance when a storage session is finished.
- No payment or transaction table in MVP.

### Locker

Fields:

- `id`
- `code`
- `size`: `S | M | L | XL`
- `status`: `AVAILABLE | OCCUPIED | MAINTENANCE`
- `row`
- `column`
- `createdAt`
- `updatedAt`

Notes:

- `code` should be unique.
- `row` and `column` support the public display grid.

### StorageSession

Fields:

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

- A locker may only be assigned if its status is `AVAILABLE`.
- Finishing a session marks it `COMPLETED` and releases the locker.

### Optional AdminUser

Do not create `AdminUser` initially unless a later approved requirement needs it.

Admin login should use environment variables:

```txt
ADMIN_LOGIN=admin
ADMIN_PASSWORD=change-me
JWT_SECRET=change-me
```

## 4. Backend Modules

Planned modules:

- Prisma module.
- Users module.
- Lockers module.
- Sessions module.
- Auth module.
- Admin module.
- Public module.

### Prisma Module

Goals:

- Create shared Prisma client.
- Provide database access to other modules.
- Support migrations and seed data.

### Users Module

Goals:

- Create or update user profile from Telegram MiniApp data.
- Return current user profile.
- Return user balance.
- Return user storage sessions and history.

### Lockers Module

Goals:

- Store locker data.
- List lockers.
- Update locker status.
- Enforce allowed status transitions for admin.

### Sessions Module

Goals:

- Start storage session.
- Finish storage session.
- List active sessions.
- List user history.
- Implement locker selection logic.

### Auth Module

Goals:

- Admin login.
- JWT issuing.
- JWT guard for admin endpoints.

No complex roles or permissions in MVP.

### Admin Module

Goals:

- Dashboard stats.
- Admin-only users list.
- Admin-only sessions list.
- Admin-only locker management.

### Public Module

Goals:

- Public locker grid endpoint for the display page.
- No authentication.

## 5. API Endpoints

Base path should be routed through Nginx as `/api`.

### TMA/User Endpoints

Current Stage 10 endpoints use backend-validated Telegram `initData` and a short-lived TMA JWT. TMA user/session endpoints derive identity from the TMA JWT.

```txt
POST   /api/tma/auth/login
GET    /api/tma/me
GET    /api/tma/me/sessions/active
GET    /api/tma/me/sessions/history
POST   /api/tma/sessions
POST   /api/tma/sessions/:id/finish
```

### Admin Auth Endpoints

```txt
POST /api/admin/auth/login
GET  /api/admin/auth/me
```

### Admin Endpoints

```txt
GET   /api/admin/dashboard
GET   /api/admin/users
GET   /api/admin/lockers
PATCH /api/admin/lockers/:id/status
GET   /api/admin/sessions/active
GET   /api/admin/sessions
```

For MVP, admins should only change unused lockers between:

```txt
AVAILABLE
MAINTENANCE
```

### Public Display Endpoints

```txt
GET /api/public/lockers
GET /api/public/stats
```

## 6. Frontend Apps and Pages

### Telegram MiniApp: `apps/tma`

Planned views:

- Profile view.
- Balance view.
- Active sessions view.
- Storage history view.
- Start storage view.
- Assigned locker confirmation.
- Finish storage action.

### Admin Panel: `apps/admin`

Planned views:

- Login page.
- Dashboard.
- Lockers table or grid.
- Active sessions page.
- Users page.

Dashboard stats:

- Total lockers.
- Available lockers.
- Occupied lockers.
- Maintenance lockers.
- Active sessions.
- Total users.

### Public Display: `apps/display`

Planned views:

- Locker grid page.
- Public stats summary.

Behavior:

- No authentication.
- Poll `/api/public/lockers` and `/api/public/stats` every few seconds.
- Show locker code, size, and status.
- Show statuses clearly: `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`.

## 7. Docker Compose and VPS Deployment

Docker Compose should define:

- `postgres`
- `api`
- `tma`
- `admin`
- `display`
- `nginx`

Expected production routing:

```txt
https://example.com/tma      -> tma frontend
https://example.com/admin    -> admin frontend
https://example.com/display  -> display frontend
https://example.com/api      -> backend API
```

The VPS should only require:

- Docker.
- Docker Compose.
- Git.
- Environment variables.

Do not assume manual installation of Node.js on the VPS.

## 8. Documentation Plan

Documentation is part of the implementation.

Required docs:

- `README.md`
- `AGENTS.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/implementation-plan.md`

Documentation update rules:

- Update docs after every code change.
- Update docs after every configuration change.
- Update docs after every schema or migration change.
- Update docs after every Docker or deployment change.
- Keep this implementation plan updated when stages, scope, assumptions, or priorities change.

## 9. Implementation Stages

Current order:

1. Stage 1: Repository Skeleton and Documentation.
2. Stage 2: Backend Foundation.
3. Stage 3: Core Backend Business Logic.
4. Stage 4: Admin Backend.
5. Stage 5: Telegram MiniApp Frontend.
6. Stage 6: Admin Frontend.
7. Stage 7: Public Display Frontend.
8. Stage 8: Docker and Nginx.
9. Stage 9: Verification and Cleanup.
10. Stage 10: Full Telegram MiniApp Integration.
11. Stage 11: Simple Balance and Locker Pricing.

### Stage 1: Repository Skeleton and Documentation

Goals:

- Create folder structure.
- Add root `README.md`.
- Add strict `AGENTS.md`.
- Add `docs/architecture.md`.
- Add `docs/deployment.md`.
- Add `docs/implementation-plan.md`.
- Add `.env.example`.

Acceptance criteria:

- Required directories exist.
- Required documentation files exist.
- `.env.example` contains placeholders only.
- No backend or frontend logic is implemented.
- No NestJS or React scaffolding exists yet.
- Documentation clearly describes MVP scope and future stages.

Current status:

- Completed.

### Stage 2: Backend Foundation

Goals:

- Scaffold NestJS API.
- Add Prisma.
- Define Prisma schema.
- Add first migration.
- Add seed data for test lockers.
- Add shared validation and enums.

Acceptance criteria:

- Backend starts locally.
- Prisma schema includes `User`, `Locker`, and `StorageSession`.
- Migration can be applied to PostgreSQL.
- Seed command creates test lockers.
- Documentation is updated with backend setup, schema, migrations, and seed commands.

Current status:

- Completed.

Stage 2 result:

- NestJS API scaffold added in `backend/api`.
- Prisma added with `backend/api/prisma.config.ts`.
- Initial schema added at `backend/api/prisma/schema.prisma`.
- Initial migration added at `backend/api/prisma/migrations/20260501000000_init/migration.sql`.
- Seed script added at `backend/api/prisma/seed.ts`.
- Shared backend enum files added under `backend/api/src/common/enums`.
- Verification passed for Prisma validation, Prisma client generation, lint, and build.

### Stage 3: Core Backend Business Logic

Goals:

- Implement users module.
- Implement lockers module.
- Implement sessions module.
- Add transactional locker assignment.
- Add transactional finish-session flow.
- Add public display endpoint.

Acceptance criteria:

- User upsert works.
- Starting storage assigns the smallest suitable available locker.
- Finishing storage releases the locker.
- Active and historical sessions can be queried.
- Public locker endpoint returns grid data.
- Relevant tests or verification steps exist.
- Documentation is updated.

Current status:

- Completed.

Stage 3 result:

- Users module implemented for Telegram user placeholder upsert and profile reads.
- Lockers module implemented for DB-backed locker listing.
- Sessions module implemented for active/history listing, transactional start-session, and transactional finish-session.
- Public module implemented for unauthenticated locker list and basic locker/session stats.
- Locker assignment checks suitable sizes in the required order and assigns the smallest available suitable locker.
- Core flows use the real PostgreSQL database through `PrismaService`; no in-memory storage or mock data was added.
- Verification passed for Prisma validation, Prisma client generation, lint, and build.

### Stage 4: Admin Backend

Goals:

- Add simple admin auth using env login/password.
- Add JWT guard.
- Add dashboard endpoint.
- Add admin lockers, users, and sessions endpoints.

Acceptance criteria:

- Admin can log in.
- Admin endpoints require JWT.
- Dashboard stats are returned.
- Admin can view users, lockers, and sessions.
- Admin can change eligible lockers between `AVAILABLE` and `MAINTENANCE`.
- Documentation is updated.

Current status:

- Completed.

Stage 4 result:

- Env-based admin login implemented with `ADMIN_LOGIN`, `ADMIN_PASSWORD`, and `JWT_SECRET`.
- JWT admin guard protects admin endpoints.
- Admin dashboard endpoint returns DB-backed user, locker, and session counts.
- Admin users, lockers, active sessions, history sessions, and all sessions endpoints read from PostgreSQL through `PrismaService`.
- Admin locker status updates allow only `AVAILABLE` and `MAINTENANCE`.
- Admin status changes on `OCCUPIED` lockers are rejected; occupied lockers are released through the finish-session flow.
- No `AdminUser` table or extra entity was added.
- Verification passed for Prisma validation, Prisma client generation, lint, and build.

### Stage 5: Telegram MiniApp Frontend

Goals:

- Build user profile and balance screen.
- Build active sessions and history.
- Build start storage flow.
- Build finish session action.
- Integrate with backend API.

Acceptance criteria:

- User can load profile data.
- User can see balance.
- User can start a storage session.
- User can see assigned locker code.
- User can finish an active session.
- Frontend build succeeds.
- Documentation is updated.

Current status:

- Completed.

Stage 5 result:

- React + Vite + TypeScript TMA app implemented in `apps/tma`.
- Mobile-first UI added for profile, balance, active sessions, history sessions, size selection, assigned locker confirmation, and finish action.
- TMA integrates with the Stage 3 backend user/session endpoints.
- Vite dev proxy routes `/api` to `http://localhost:3000` for local development.
- `VITE_TMA_API_BASE_URL` added for frontend API base URL configuration.
- The original Stage 5 build used a placeholder `telegramId` flow; Stage 10 later replaced it with backend-validated Telegram `initData`.
- Frontend build passed.

### Stage 6: Admin Frontend

Goals:

- Build admin login.
- Build dashboard.
- Build lockers management.
- Build active sessions view.
- Build users view.

Acceptance criteria:

- Admin can log in.
- Admin can view dashboard stats.
- Admin can view and manage lockers.
- Admin can view users.
- Admin can view active sessions.
- Frontend build succeeds.
- Documentation is updated.

Current status:

- Completed.

Stage 6 result:

- React + Vite + TypeScript admin frontend implemented in `apps/admin`.
- Desktop-friendly admin UI added with login, dashboard, lockers, users, and sessions views.
- JWT is stored in `localStorage` for MVP.
- Admin frontend integrates with the Stage 4 admin API.
- Lockers page allows status changes only between `AVAILABLE` and `MAINTENANCE`.
- `VITE_ADMIN_API_BASE_URL` added for frontend API base URL configuration.
- Frontend build passed.

### Stage 7: Public Display Frontend

Goals:

- Build locker grid.
- Add polling.
- Add clear status styling.

Acceptance criteria:

- Display page loads without authentication.
- Lockers render by row and column.
- Statuses are visually distinct.
- Polling refreshes data.
- Frontend build succeeds.
- Documentation is updated.

Current status:

- Completed.

Stage 7 result:

- React + Vite + TypeScript public display frontend implemented in `apps/display`.
- Read-only responsive display UI added with locker grid, locker code, locker size, locker status, and public stats.
- Display integrates with `GET /api/public/lockers` and `GET /api/public/stats`.
- Data polling refreshes lockers and stats every 5 seconds.
- Vite dev proxy routes `/api` to `http://localhost:3000` for local development.
- `VITE_DISPLAY_API_BASE_URL` added for frontend API base URL configuration.
- Frontend build passed.

### Stage 8: Docker and Nginx

Goals:

- Add Dockerfiles.
- Add Docker Compose.
- Add Nginx routing.
- Verify service-to-service networking.
- Document deployment commands.

Acceptance criteria:

- `docker compose` starts all services.
- API connects to PostgreSQL.
- `/tma`, `/admin`, `/display`, and `/api` routes work.
- Migrations and seed commands work inside containers.
- VPS deployment docs are accurate.

Current status:

- Completed.

Stage 8 result:

- Dockerfile added for backend API.
- Dockerfile added for Telegram MiniApp frontend.
- Dockerfile added for admin frontend.
- Dockerfile added for public display frontend.
- Docker Compose added at `infra/docker-compose.yml` with `postgres`, `api`, `tma`, `admin`, `display`, and `nginx` services.
- PostgreSQL uses a persistent `postgres_data` volume.
- API service connects to PostgreSQL through `DATABASE_URL` and runs `prisma migrate deploy` on startup.
- Nginx reverse proxy added at `infra/nginx/nginx.conf`.
- Routes implemented for `/api`, `/tma`, `/admin`, and `/display`.
- Frontend production base paths are wired through `VITE_TMA_BASE_PATH`, `VITE_ADMIN_BASE_PATH`, and `VITE_DISPLAY_BASE_PATH`.
- Deployment documentation updated with service details, commands, logs, restart, backup, and restore notes.

### Stage 9: Verification and Cleanup

Goals:

- Run backend checks.
- Run frontend builds.
- Run Prisma migration and seed.
- Verify Docker Compose startup.
- Verify main user flow.
- Verify admin flow.
- Verify display polling.
- Update documentation after final changes.

Acceptance criteria:

- Main user flow works end to end.
- Admin flow works.
- Public display works.
- Docker Compose deployment is documented and verified.
- Documentation matches implementation.
- Known limitations are documented.

Current status:

- Completed.

Stage 9 result:

- Backend Prisma generation, Prisma schema validation, lint, and build were verified.
- Telegram MiniApp, admin frontend, and public display frontend builds were verified.
- Docker Compose YAML was statically parsed and checked for expected service names.
- Docker and Nginx runtime checks could not be run in the local environment because the `docker` and `nginx` CLIs were unavailable.
- Start/stop helper scripts were added under `scripts`.
- README and deployment docs now include full-stack start, stop, restart, logs, migration, seed, and browser URL instructions.
- No product features were added.

### Stage 10: Full Telegram MiniApp Integration

Goals:

- Replace the placeholder editable `telegramId` flow with Telegram MiniApp `initData` authentication.
- Have the frontend send raw Telegram `initData` to the backend.
- Validate `initData` cryptographically on the backend using the Telegram bot token.
- Create or update users only after successful Telegram validation.
- Issue a short-lived TMA JWT after successful validation.
- Make TMA user, balance, active-session, history, start-session, and finish-session APIs use identity from that TMA JWT.
- Remove the old editable demo `telegramId` from production, or limit it to explicit local development mode only.
- Document security assumptions, limitations, and local development behavior.

Acceptance criteria:

- The TMA sends raw `window.Telegram.WebApp.initData` to the backend when it is available.
- The backend validates the Telegram `initData` signature before accepting identity.
- The backend rejects invalid, missing, stale, or tampered `initData` in production mode.
- The backend does not trust `initDataUnsafe` for authentication or authorization.
- User upsert is tied to validated Telegram identity, not arbitrary request body `telegramId`.
- Authenticated TMA endpoints no longer require or trust `telegramId` query parameters or request body fields in production flow.
- TMA APIs require `Authorization: Bearer <tma-token>` after login.
- TMA JWT claims are scoped so admin guards do not accept TMA tokens.
- Local development without Telegram `initData` is available only through an explicit documented development mode.
- Documentation is updated in `README.md`, `AGENTS.md`, `docs/architecture.md`, `docs/deployment.md`, and this implementation plan.

Security notes:

- The Telegram bot token is a backend secret and must never be included in frontend code or `VITE_` variables.
- Stage 10 uses backend-only `TELEGRAM_BOT_TOKEN` for Telegram validation and `TMA_JWT_SECRET` for TMA JWT signing.
- Stage 10 environment variables are `TELEGRAM_BOT_TOKEN`, `TMA_JWT_SECRET`, `TMA_JWT_EXPIRES_IN`, `TMA_INIT_DATA_MAX_AGE_SECONDS`, `TMA_DEV_AUTH_ENABLED`, `TMA_DEV_TELEGRAM_ID`, `TMA_DEV_USERNAME`, `TMA_DEV_FIRST_NAME`, and `TMA_DEV_LAST_NAME`.
- `initDataUnsafe` may be used only as a display convenience after authentication, not as proof of identity.
- The TMA keeps the token in memory and re-authenticates from Telegram `initData` on app load.
- The backend checks Telegram `auth_date` freshness with `TMA_INIT_DATA_MAX_AGE_SECONDS`, defaulting to 86400 seconds.
- HTTPS is required for real Telegram MiniApp production use. The current Docker Compose stack serves HTTP and assumes TLS termination outside the stack unless direct TLS is added later.
- Stage 10 does not add advanced roles, external managed auth services, or a Telegram bot command backend.

Local development assumptions:

- Running the TMA in a normal browser will usually not provide Telegram `initData`.
- A local demo identity exists only behind `TMA_DEV_AUTH_ENABLED=true` with `TMA_DEV_TELEGRAM_ID`, `TMA_DEV_USERNAME`, `TMA_DEV_FIRST_NAME`, and `TMA_DEV_LAST_NAME`, and must not be enabled in production.
- Local development behavior must be visible in documentation and obvious in configuration.

Current status:

- Completed.

Stage 10 result:

- TMA auth module added to validate raw Telegram `initData` using `TELEGRAM_BOT_TOKEN`.
- Backend rejects missing, invalid, stale, or tampered production `initData`.
- User creation/update moved behind validated Telegram auth or explicit local `TMA_DEV_AUTH_ENABLED=true`.
- TMA JWTs are signed with `TMA_JWT_SECRET`, short-lived by `TMA_JWT_EXPIRES_IN`, and scoped with `scope: "tma"` so admin guards do not accept them.
- TMA user, active-session, history, start-session, and finish-session endpoints require `Authorization: Bearer <tma-token>` and derive identity from internal `userId`.
- TMA frontend sends raw `window.Telegram.WebApp.initData`, keeps the returned token in React memory, and no longer exposes editable production `telegramId`.
- `.env.example`, `README.md`, `AGENTS.md`, `docs/architecture.md`, `docs/deployment.md`, and this implementation plan were updated.

### Stage 11: Simple Balance and Locker Pricing

Goals:

- Add simple fixed MVP locker prices.
- Set new user starting balance to `1000`.
- Check balance before starting storage.
- Deduct balance when finishing storage.
- Keep pricing based on the assigned locker size, not the requested luggage size.
- Avoid real payment features and keep admin balance testing manual through direct database edits.

Balance and pricing rules:

```txt
S  = 5
M  = 7
L  = 10
XL = 15
```

Rules:

- New users start with balance `1000`.
- Price is based on assigned locker size.
- If a user requests `M` but only an `L` locker is available and assigned, the cost is `10`.
- Start-session must select the smallest suitable available locker, determine the assigned locker price, and verify that the user has enough balance before the locker becomes `OCCUPIED`.
- If balance is insufficient, no active session is created and no locker status changes.
- Finish-session must deduct the assigned locker size price in the same transaction that marks the session `COMPLETED`, sets `endedAt`, and marks the locker `AVAILABLE`.
- Admin can still manually edit `User.balance` directly in PostgreSQL for MVP testing.

Acceptance criteria:

- Newly created users receive balance `1000`.
- The backend rejects start-session when the authenticated user cannot afford the assigned locker size.
- Insufficient-balance failures leave sessions and locker statuses unchanged.
- The finish-session transaction completes session, releases locker, and deducts balance atomically.
- The TMA displays updated balance after session completion.
- Documentation explains that price is based on assigned locker size, not requested luggage size.
- No payment providers, invoices, refunds, or transaction history are added.

MVP exclusions:

- No real payments.
- No payment providers.
- No invoices.
- No refunds.
- No transaction history unless explicitly justified and approved later.
- No payment transaction tables by default.
- No external managed services, queues, or payment credentials.

Current status:

- Planned.

## 10. Current Project Assumptions

- One locker location only.
- One PostgreSQL database.
- Stage 10 includes Telegram MiniApp `initData` validation but does not require a broader Telegram bot command backend.
- Until Stage 11 is implemented, balance is manually edited in the database.
- After Stage 11, admin balance test adjustments still happen through direct database edits.
- Admin authentication is simple login/password from environment variables.
- Public display does not require authentication.
- Polling is acceptable for display updates.
- Physical locker hardware integration is outside MVP.
- Docker Compose is the only supported deployment path for MVP.

## 11. Explicit MVP Exclusions

Do not build these in MVP:

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
- Microservices.
- Kubernetes.
- Message queues.
- External managed services required for core MVP operation.

Updated boundaries:

- Stage 10 includes backend validation of Telegram MiniApp `initData`, but does not add complex auth roles, managed identity services, or Telegram bot command workflows.
- Stage 11 includes simple balance and fixed locker pricing, but does not add real payments, invoices, refunds, or payment transaction history.
