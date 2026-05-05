# locker-mvp

`locker-mvp` is an MVP for an electronic luggage locker system. Users interact with the system through a Telegram MiniApp, administrators manage lockers and sessions through a web panel, and a public display page shows locker availability.

This repository is currently at Stage 4: admin backend. The NestJS API, Prisma schema, initial migration, seed script, user endpoints, locker endpoints, storage session flows, public read-only endpoints, and JWT-protected admin backend endpoints exist under `backend/api`. Frontend apps, Docker Compose services, and Nginx configuration are planned but not implemented yet.

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
│   ├── admin/
│   └── display/
├── backend/
│   └── api/
│       ├── prisma/
│       │   ├── migrations/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       ├── src/
│       ├── package.json
│       └── prisma.config.ts
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

Planned responsibilities:

- `apps/tma`: Telegram MiniApp frontend.
- `apps/admin`: Admin web panel frontend.
- `apps/display`: Public locker display frontend.
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

Planned future frontend flow:

```sh
# start Telegram MiniApp frontend after app is scaffolded
npm run dev:tma

# start admin frontend after app is scaffolded
npm run dev:admin

# start display frontend after app is scaffolded
npm run dev:display
```

The exact commands must be updated when package scripts are added.

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

## Planned Docker Compose Deployment Flow

Docker Compose will be the required deployment path for the MVP. The planned services are:

- `postgres`
- `api`
- `tma`
- `admin`
- `display`
- `nginx`

Expected future flow:

```sh
cp .env.example .env
# edit .env with environment-specific values
docker compose -f infra/docker-compose.yml up -d --build
```

The Docker Compose file has not been created yet. This section must be updated when infra is implemented.

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

Planned variables are listed in [.env.example](.env.example).

Required planned variables:

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
ADMIN_PUBLIC_API_BASE_URL
DISPLAY_PUBLIC_API_BASE_URL
NGINX_HTTP_PORT
NGINX_HTTPS_PORT
PUBLIC_DOMAIN
```

Never commit real secrets. `.env.example` must contain placeholders only.

## Useful Commands

These commands are planned and must be verified or updated as implementation progresses:

```sh
# backend only
cd backend/api
npm install
npm run prisma:generate
npm run build
npm run lint

# start all services through Docker Compose
docker compose -f infra/docker-compose.yml up -d --build

# stop all services
docker compose -f infra/docker-compose.yml down

# view logs
docker compose -f infra/docker-compose.yml logs -f

# run Prisma migrations
docker compose -f infra/docker-compose.yml exec api npx prisma migrate deploy

# seed test data
docker compose -f infra/docker-compose.yml exec api npm run db:seed
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
