# locker-mvp

`locker-mvp` is an MVP for an electronic luggage locker system. Users interact with the system through a Telegram MiniApp, administrators manage lockers and sessions through a web panel, and a public display page shows locker availability.

This repository has completed Stage 11: simple balance and locker pricing. The NestJS backend exists under `backend/api`, the user-facing Telegram MiniApp exists under `apps/tma`, the React + Vite + TypeScript admin frontend exists under `apps/admin`, the public display frontend exists under `apps/display`, Docker Compose deployment files exist under `infra`, and helper scripts exist under `scripts`.

## MVP Scope

The MVP will include:

- Telegram MiniApp for users.
- Admin web panel.
- Public locker display page.
- Backend API.
- PostgreSQL database.
- Prisma schema, migrations, and seed data.
- Docker Compose deployment.
- Nginx routing.
- Backend-validated Telegram MiniApp `initData` authentication.
- Simple fixed locker pricing and balance deduction.
- Mandatory documentation.

The MVP will not include:

- Real payments.
- Payment providers.
- Invoices.
- Refunds.
- Transaction history.
- Physical locker integration.
- WebSockets unless explicitly approved later.
- Complex analytics.
- Multiple locker locations.
- QR codes.
- 3D visualization.
- Real baggage dimension input.

## Project Structure

```txt
./
├── apps/
│   ├── tma/
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── admin/
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── display/
│       ├── src/
│       ├── package.json
│       └── vite.config.ts
├── backend/
│   └── api/
│       ├── Dockerfile
│       ├── prisma/
│       │   ├── migrations/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       ├── src/
│       ├── package.json
│       └── prisma.config.ts
├── infra/
│   ├── docker-compose.yml
│   └── nginx/
│       └── nginx.conf
├── scripts/
│   ├── start-dev.sh
│   └── stop-dev.sh
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   └── implementation-plan.md
├── README.md
├── AGENTS.md
└── .env.example
```

Planned responsibilities:

- `apps/tma`: React + Vite Telegram MiniApp frontend.
- `apps/admin`: React + Vite admin web panel frontend.
- `apps/display`: React + Vite public locker display frontend.
- `backend/api`: NestJS backend API with Prisma schema, initial migration, and seed data.
- `infra`: Docker Compose and Nginx deployment files.
- `scripts`: simple Docker Compose start/stop helpers.
- `docs`: architecture, deployment, and implementation planning documents.

## Implementation Plan

The full MVP implementation plan is maintained in [docs/implementation-plan.md](docs/implementation-plan.md).

Future agents must update `docs/implementation-plan.md` whenever implementation stages, scope, priorities, assumptions, or MVP boundaries change.

## Planned Local Development Flow

Local backend development currently happens from `backend/api`.

Backend setup:

```sh
# from repository root
cd backend/api
npm install

# generate Prisma client
npm run prisma:generate

# run the API in watch mode
npm run start:dev
```

The backend reads environment variables from `backend/api/.env` or the repository-root `.env`.

The backend exposes a basic health endpoint at:

```txt
GET /api/health
```

Current backend API endpoints:

```txt
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

The TMA, Stage 3, and Stage 4 endpoints use the real PostgreSQL database through Prisma. There is no in-memory storage or mock data in the core flows.

Telegram MiniApp frontend:

```sh
# from repository root
cd apps/tma
npm install
npm run dev

# production build
npm run build
```

In local development, the TMA Vite dev server proxies `/api` to `http://localhost:3000`.

The TMA reads its API base URL from:

```txt
VITE_TMA_API_BASE_URL=/api
VITE_TMA_BASE_PATH=/tma/
```

If `VITE_TMA_API_BASE_URL` is not set, the app defaults to `/api`. If `VITE_TMA_BASE_PATH` is not set, local builds default to `/`; the Docker build passes `/tma/`.

When opened inside Telegram, the TMA sends raw `window.Telegram.WebApp.initData` to `POST /api/tma/auth/login`. The backend validates the signature and `auth_date`, creates or updates the user, and returns a short-lived TMA JWT. The TMA stores that token in React memory only and sends it as `Authorization: Bearer <tma-token>` to user and session APIs.

Normal browser development has no Telegram `initData`. To use the local demo identity, set `TMA_DEV_AUTH_ENABLED=true` in the backend environment and configure the `TMA_DEV_*` identity variables. Keep `TMA_DEV_AUTH_ENABLED=false` in production.

Admin frontend flow:

```sh
# from repository root
cd apps/admin
npm install
npm run dev

# production build
npm run build
```

In local development, the admin Vite dev server proxies `/api` to `http://localhost:3000`.

The admin frontend reads its API base URL from:

```txt
VITE_ADMIN_API_BASE_URL=/api
VITE_ADMIN_BASE_PATH=/admin/
```

If `VITE_ADMIN_API_BASE_URL` is not set, the app defaults to `/api`. If `VITE_ADMIN_BASE_PATH` is not set, local builds default to `/`; the Docker build passes `/admin/`.

Public display frontend:

```sh
# from repository root
cd apps/display
npm install
npm run dev

# production build
npm run build
```

In local development, the display Vite dev server proxies `/api` to `http://localhost:3000`.

The display frontend reads its API base URL from:

```txt
VITE_DISPLAY_API_BASE_URL=/api
VITE_DISPLAY_BASE_PATH=/display/
```

If `VITE_DISPLAY_API_BASE_URL` is not set, the app defaults to `/api`. If `VITE_DISPLAY_BASE_PATH` is not set, local builds default to `/`; the Docker build passes `/display/`.

## Backend Database Commands

These commands require `DATABASE_URL` to point at a running PostgreSQL database:

```sh
cd backend/api

# apply migrations in development
npm run prisma:migrate:dev

# apply existing migrations in deployment-like environments
npm run prisma:migrate:deploy

# seed deterministic test lockers
npm run db:seed
```

The initial seed creates these lockers:

```txt
A01 S   A02 S   A03 M   A04 M
B01 L   B02 L   B03 XL  B04 XL
```

## Backend API Examples

Authenticate a Telegram MiniApp user:

```sh
curl -X POST http://localhost:3000/api/tma/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"initData":"<raw-window.Telegram.WebApp.initData>"}'
```

Start a storage session:

```sh
curl -X POST http://localhost:3000/api/tma/sessions \
  -H 'Authorization: Bearer <tma-token>' \
  -H 'Content-Type: application/json' \
  -d '{"requestedSize":"M"}'
```

Finish a storage session:

```sh
curl -X POST http://localhost:3000/api/tma/sessions/<session-id>/finish \
  -H 'Authorization: Bearer <tma-token>'
```

Read public locker data:

```sh
curl http://localhost:3000/api/public/lockers
curl http://localhost:3000/api/public/stats
```

Admin login and protected admin calls:

```sh
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"admin","password":"change-me"}'

curl http://localhost:3000/api/admin/dashboard \
  -H 'Authorization: Bearer <access-token>'

curl http://localhost:3000/api/admin/users \
  -H 'Authorization: Bearer <access-token>'

curl http://localhost:3000/api/admin/sessions/active \
  -H 'Authorization: Bearer <access-token>'

curl -X PATCH http://localhost:3000/api/admin/lockers/<locker-id>/status \
  -H 'Authorization: Bearer <access-token>' \
  -H 'Content-Type: application/json' \
  -d '{"status":"MAINTENANCE"}'
```

Admin locker status changes only allow `AVAILABLE` and `MAINTENANCE`. `OCCUPIED` lockers cannot be changed manually; they are released by finishing active storage sessions.

## Admin Frontend Notes

The Stage 6 admin frontend implements:

- admin login;
- JWT storage in `localStorage` for MVP;
- dashboard stats;
- lockers management;
- users table;
- sessions table with active, history, and all views;
- locker status changes between `AVAILABLE` and `MAINTENANCE`;
- backend error display.

The admin frontend does not allow manually setting lockers to `OCCUPIED`.

## Public Display Notes

The Stage 7 public display frontend implements:

- unauthenticated read-only locker grid;
- locker code, size, and status display;
- public stats summary;
- clear visual states for `AVAILABLE`, `OCCUPIED`, and `MAINTENANCE`;
- polling every 5 seconds through the public backend API.

The display frontend does not include admin controls, QR codes, WebSockets, payments, Docker, or Nginx implementation.

## Telegram MiniApp Notes

The Stage 5 Telegram MiniApp implements the user-facing MVP flow:

- profile and balance display;
- active sessions;
- history sessions;
- start storage with `S`, `M`, `L`, or `XL`;
- assigned locker confirmation;
- finish storage action.

The Stage 10 Telegram MiniApp sends raw `window.Telegram.WebApp.initData` to the backend on load. It does not authenticate with `initDataUnsafe`, editable `telegramId`, query parameters, or request-body identity fields.

## Stage 10: Full Telegram MiniApp Integration

Stage 10 replaces the placeholder TMA identity flow with Telegram MiniApp authentication based on backend-validated `initData`.

Implemented flow:

1. The TMA reads the raw `window.Telegram.WebApp.initData` string when opened inside Telegram.
2. The TMA sends that raw `initData` to the backend.
3. The backend validates `initData` cryptographically using the Telegram bot token.
4. The backend creates or updates the user only after validation succeeds.
5. The backend returns a short-lived TMA JWT containing the internal `userId`, Telegram identity, and `scope: "tma"`.
6. The TMA sends that token as `Authorization: Bearer <token>` to user/session APIs.
7. The backend stops trusting client-supplied `telegramId` and never uses `initDataUnsafe` for authentication.

Acceptance criteria:

- Invalid, missing, stale, or tampered `initData` is rejected in production mode.
- `initDataUnsafe` may be used only for non-security UI display hints, not for authentication.
- The editable demo `telegramId` is removed from production and allowed only behind an explicit local development mode.
- Documentation explains how local development works when Telegram `initData` is unavailable.
- Security assumptions and limitations are documented before implementation is considered complete.

Security and local development notes:

- The Telegram bot token stays backend-only.
- The TMA JWT should be short-lived and scoped to TMA user APIs.
- The TMA keeps the token in memory and re-authenticates from Telegram `initData` on app load.
- Local browser development without Telegram `initData` uses only the explicit backend `TMA_DEV_AUTH_ENABLED=true` demo mode.
- Telegram `auth_date` must be no older than `TMA_INIT_DATA_MAX_AGE_SECONDS`, defaulting to 86400 seconds.

Deployment impact:

- Stage 10 adds backend-only `TELEGRAM_BOT_TOKEN` and `TMA_JWT_SECRET`.
- `TMA_JWT_EXPIRES_IN`, `TMA_INIT_DATA_MAX_AGE_SECONDS`, and `TMA_DEV_*` variables configure token lifetime, stale `initData` rejection, and explicit local demo authentication.

## Stage 11: Simple Balance and Locker Pricing

Stage 11 adds simple MVP balance and pricing rules without adding real payments.

Rules:

- New users start with balance `1000`.
- Fixed locker prices are `S = 5`, `M = 7`, `L = 10`, and `XL = 15`.
- Price is based on the assigned locker size, not the requested luggage size.
- Example: if a user requests `M` but the backend assigns an `L` locker, the cost is `10`.
- Before storage starts, the backend checks that the user has enough balance for the assigned locker.
- If balance is insufficient, storage does not start and no locker becomes `OCCUPIED`.
- When storage is finished, the backend deducts the assigned locker price in the same transaction that completes the session and releases the locker.
- Admins may still manually edit `User.balance` directly in PostgreSQL for MVP testing.

MVP exclusions for Stage 11:

- No payment providers.
- No invoices.
- No refunds.
- No transaction history unless explicitly approved later.
- No payment transaction tables by default.

Implementation notes:

- Existing users keep their current balance until edited manually in the database.
- No payment providers, invoices, refunds, payment entities, or transaction history were added.

## How To Start The Whole Project

The full MVP runs through Docker Compose. The VPS and local Docker flow are the same.

First create a local `.env` from placeholders:

```sh
cp .env.example .env
```

Edit `.env` before production use. At minimum, replace `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, and `TMA_JWT_SECRET`.

Start the full stack with attached logs:

```sh
./scripts/start-dev.sh
```

This runs:

```sh
docker compose --env-file .env -f infra/docker-compose.yml up --build
```

Press `Ctrl+C` to stop the attached Compose run. To stop and remove the stack from another terminal:

```sh
./scripts/stop-dev.sh
```

Browser URLs after startup:

```txt
http://localhost/api/health
http://localhost/tma
http://localhost/admin
http://localhost/display
```

Apply migrations manually if needed:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec api npx prisma migrate deploy
```

The `api` container also runs `prisma migrate deploy` automatically on startup.

Seed deterministic demo lockers:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec api npm run db:seed
```

View logs:

```sh
docker compose --env-file .env -f infra/docker-compose.yml logs -f
```

Restart all services:

```sh
docker compose --env-file .env -f infra/docker-compose.yml restart
```

## Docker Compose Deployment Flow

Docker Compose is the required deployment path for the MVP. The services are:

- `postgres`
- `api`
- `tma`
- `admin`
- `display`
- `nginx`

Deployment flow:

```sh
cp .env.example .env
# edit .env with environment-specific values
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

The `api` container runs `prisma migrate deploy` before starting the NestJS server. Seed data is applied separately when needed:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec api npm run db:seed
```

Stop services with:

```sh
docker compose --env-file .env -f infra/docker-compose.yml down
```

## Planned VPS Deployment Flow

The VPS should only require:

- Docker.
- Docker Compose.
- Git.
- Environment variables in `.env`.

Planned production routes:

```txt
https://example.com/tma      -> Telegram MiniApp frontend
https://example.com/admin    -> Admin panel frontend
https://example.com/display  -> Public display frontend
https://example.com/api      -> Backend API
```

Do not assume Node.js is manually installed on the VPS. Application builds and runtime must happen through Docker images.

See [docs/deployment.md](docs/deployment.md) for the deployment strategy.

## Required Environment Variables

Variables are listed in [.env.example](.env.example).

Required variables:

```txt
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
DATABASE_URL
API_PORT
ADMIN_LOGIN
ADMIN_PASSWORD
JWT_SECRET
TELEGRAM_BOT_TOKEN
TMA_JWT_SECRET
TMA_JWT_EXPIRES_IN
TMA_INIT_DATA_MAX_AGE_SECONDS
TMA_DEV_AUTH_ENABLED
TMA_DEV_TELEGRAM_ID
TMA_DEV_USERNAME
TMA_DEV_FIRST_NAME
TMA_DEV_LAST_NAME
TMA_PUBLIC_API_BASE_URL
VITE_TMA_API_BASE_URL
VITE_TMA_BASE_PATH
ADMIN_PUBLIC_API_BASE_URL
VITE_ADMIN_API_BASE_URL
VITE_ADMIN_BASE_PATH
DISPLAY_PUBLIC_API_BASE_URL
VITE_DISPLAY_API_BASE_URL
VITE_DISPLAY_BASE_PATH
NGINX_HTTP_PORT
NGINX_HTTPS_PORT
PUBLIC_DOMAIN
```

Never commit real secrets. `.env.example` must contain placeholders only.

In Docker Compose, `API_PORT` should remain `3000` because Nginx routes to the API container on that port. Use `NGINX_HTTP_PORT` to change the host-facing HTTP port.

`NGINX_HTTPS_PORT` is reserved for a later direct-TLS Nginx setup. The current Compose file publishes HTTP only; terminate HTTPS with a VPS-level proxy or add and document TLS support later.

## Useful Commands

Useful local and deployment commands:

```sh
# backend only
cd backend/api
npm install
npm run prisma:generate
npm run build
npm run lint

# start all services through Docker Compose
docker compose --env-file .env -f infra/docker-compose.yml up -d --build

# stop all services
docker compose --env-file .env -f infra/docker-compose.yml down

# view logs
docker compose --env-file .env -f infra/docker-compose.yml logs -f

# run Prisma migrations
docker compose --env-file .env -f infra/docker-compose.yml exec api npx prisma migrate deploy

# seed test data
docker compose --env-file .env -f infra/docker-compose.yml exec api npm run db:seed
```

If any documented command fails, fix the command or update the documentation in the same change.

## Documentation Maintenance Rule

Documentation is mandatory project state.

After every code change, configuration change, database schema change, Docker change, or deployment change, update the relevant documentation in the same work session.

At minimum, future changes may require updates to:

- `README.md`
- `AGENTS.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/implementation-plan.md`

If documentation is not updated after a relevant change, the task is incomplete.
