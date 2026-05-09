# locker-mvp

`locker-mvp` is an MVP for an electronic luggage locker system. Users interact with the system through a Telegram MiniApp, administrators manage lockers and sessions through a web panel, and a public display page shows locker availability.

This repository is currently at Stage 8: Docker Compose and Nginx deployment. The NestJS backend exists under `backend/api`, the user-facing Telegram MiniApp exists under `apps/tma`, the React + Vite + TypeScript admin frontend exists under `apps/admin`, the public display frontend exists under `apps/display`, and Docker Compose deployment files exist under `infra`.

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
POST /api/tma/users/upsert
GET  /api/tma/me?telegramId=<telegram-id>
GET  /api/tma/me/sessions/active?telegramId=<telegram-id>
GET  /api/tma/me/sessions/history?telegramId=<telegram-id>
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

The Stage 3 and Stage 4 endpoints use the real PostgreSQL database through Prisma. There is no in-memory storage or mock data in the core flows.

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

Create or update a Telegram user placeholder:

```sh
curl -X POST http://localhost:3000/api/tma/users/upsert \
  -H 'Content-Type: application/json' \
  -d '{"telegramId":"1001","username":"demo","firstName":"Demo","lastName":"User"}'
```

Start a storage session:

```sh
curl -X POST http://localhost:3000/api/tma/sessions \
  -H 'Content-Type: application/json' \
  -d '{"telegramId":"1001","requestedSize":"M"}'
```

Finish a storage session:

```sh
curl -X POST http://localhost:3000/api/tma/sessions/<session-id>/finish \
  -H 'Content-Type: application/json' \
  -d '{"telegramId":"1001"}'
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

For MVP, the app uses the current placeholder `telegramId` flow. It attempts to read `window.Telegram.WebApp.initDataUnsafe.user.id` when opened inside Telegram, and falls back to editable demo user `1001` outside Telegram.

Production Telegram `initData` validation is not implemented yet.

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

Commands that do not exist yet must be implemented or corrected during later stages.

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
