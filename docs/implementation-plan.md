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
- `balance` is a numeric database field only.
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

```txt
POST   /api/tma/users/upsert
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

Behavior:

- No authentication.
- Poll `/api/public/lockers` every few seconds.
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

## 10. Current Project Assumptions

- One locker location only.
- One PostgreSQL database.
- No real Telegram bot backend is required for MVP beyond MiniApp-facing user profile handling.
- Balance is manually edited in the database.
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
- Transaction history.
- Physical locker integration.
- WebSockets.
- Complex analytics.
- Multiple locker locations.
- QR codes.
- 3D visualization.
- Real baggage dimension input.
- Complex admin roles.
- Production-grade Telegram auth hardening unless explicitly requested.
- Microservices.
- Kubernetes.
- Message queues.
- External managed services required for core MVP operation.
