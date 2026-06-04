# Электронная камера хранения багажа

MVP сервиса электронной камеры хранения багажа.

Проект состоит из Telegram MiniApp для пользователей, админ-панели,
публичного экрана доступности ячеек и NestJS API с PostgreSQL.
Бизнес-логика хранится на backend: авторизация Telegram, подбор ячейки,
старт и завершение хранения, списание фиксированной цены с баланса.

## Контрибьюторы

- Ишкинеев Искандер
- Хазипов Альберт
- Зорин Никита

## Current VPS Deployment

The project is currently deployed on a VPS and served over HTTP through Docker Compose and Nginx.

Public links:

```txt
http://157.22.199.163/display/
http://157.22.199.163/admin/
```

The Telegram MiniApp is tested through the Telegram Test Server Environment bot because Telegram's main production environment accepts only HTTPS MiniApp URLs.

## Web Locker

Electronic luggage locker MVP with a Telegram MiniApp, admin panel, public availability display, NestJS API, PostgreSQL, Docker Compose, and Nginx routing.

The project is intentionally small: one backend owns the business rules, three thin frontend apps call the API, and Docker Compose is the deployment path.

## What Is Included

- Telegram MiniApp for users: profile, balance, active sessions, history, start storage, finish storage.
- Admin panel: login, dashboard, lockers, users, active/history sessions.
- Public display: read-only locker grid with polling.
- Backend API: Telegram `initData` auth, admin JWT auth, locker assignment, fixed pricing, session lifecycle, health checks, metrics, structured logs.
- PostgreSQL persistence through Prisma migrations and deterministic seed data.
- Docker Compose services for the API, database, frontends, and Nginx.

Not included unless explicitly added later: real payments, refunds, invoices, transaction history, physical locker integration, QR codes, WebSockets, multiple locations, complex analytics, Kubernetes, queues, or external managed services.

## Stack

- Frontend: React + Vite + TypeScript.
- Backend: NestJS + TypeScript.
- Database: PostgreSQL.
- ORM: Prisma.
- Deployment: Docker Compose.
- Reverse proxy: Nginx.

## Repository Layout

```txt
apps/
  tma/       Telegram MiniApp
  admin/     Admin panel
  display/   Public display
backend/
  api/       NestJS API, Prisma schema, migrations, seed
infra/
  docker-compose.yml
  nginx/nginx.conf
scripts/
  start-dev.sh
  stop-dev.sh
docs/
  architecture.md
  deployment.md
  implementation-plan.md
```

## Quick Start

Create an environment file:

```sh
cp .env.example .env
```

Edit `.env` before production use. At minimum, replace:

```txt
POSTGRES_PASSWORD
ADMIN_PASSWORD
JWT_SECRET
TELEGRAM_BOT_TOKEN
TMA_JWT_SECRET
```

Start the full stack:

```sh
./scripts/start-dev.sh
```

That runs:

```sh
docker compose --env-file .env -f infra/docker-compose.yml up --build
```

Stop and remove the stack:

```sh
./scripts/stop-dev.sh
```

## Local URLs

```txt
http://localhost/tma
http://localhost/admin
http://localhost/display
http://localhost/api/health
http://localhost/api/health/db
http://localhost/api/metrics
```

Production routing is expected to use the same paths:

```txt
/tma      Telegram MiniApp
/admin    Admin panel
/display  Public display
/api      Backend API
```

The current Compose setup serves HTTP. Use a VPS-level proxy or a documented Nginx TLS update for HTTPS.

## Docker Services

```txt
postgres  PostgreSQL database with persistent volume
api       NestJS backend; runs Prisma migrations on startup
tma       Built Telegram MiniApp served by Nginx
admin     Built admin panel served by Nginx
display   Built public display served by Nginx
nginx     Public reverse proxy
```

Useful Compose commands:

```sh
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
docker compose --env-file .env -f infra/docker-compose.yml down
docker compose --env-file .env -f infra/docker-compose.yml restart
docker compose --env-file .env -f infra/docker-compose.yml logs -f
docker compose --env-file .env -f infra/docker-compose.yml logs -f api
```

## Database

The API uses Prisma with PostgreSQL. Schema changes must use migrations.

Run migrations inside Docker:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec api npx prisma migrate deploy
```

Seed demo lockers:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec api npm run db:seed
```

Current seed lockers:

```txt
A01 S   A02 S   A03 M   A04 M
B01 L   B02 L   B03 XL  B04 XL
```

For backend-only local work:

```sh
cd backend/api
npm install
npm run prisma:generate
npm run start:dev
```

`DATABASE_URL` must point to a running PostgreSQL instance.

## Environment

All variables are listed in [.env.example](.env.example). Do not commit real `.env` files.

Core backend variables:

```txt
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
```

Frontend routing variables:

```txt
VITE_TMA_API_BASE_URL=/api
VITE_TMA_BASE_PATH=/tma/
VITE_ADMIN_API_BASE_URL=/api
VITE_ADMIN_BASE_PATH=/admin/
VITE_DISPLAY_API_BASE_URL=/api
VITE_DISPLAY_BASE_PATH=/display/
```

Deployment variables:

```txt
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
NGINX_HTTP_PORT
NGINX_HTTPS_PORT
PUBLIC_DOMAIN
```

Keep `TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, `TMA_JWT_SECRET`, passwords, JWTs, Telegram `initData`, authorization headers, and database URLs out of logs and frontend builds.

## Auth Notes

The Telegram MiniApp authenticates by sending raw `window.Telegram.WebApp.initData` to:

```txt
POST /api/tma/auth/login
```

The backend validates the Telegram signature with `TELEGRAM_BOT_TOKEN`, checks freshness through `TMA_INIT_DATA_MAX_AGE_SECONDS`, creates or updates the user, and returns a short-lived TMA JWT. User/session routes require that TMA JWT.

Local browser development often has no Telegram `initData`. Use `TMA_DEV_AUTH_ENABLED=true` only for local development, with the `TMA_DEV_*` identity variables. Keep it disabled in production.

Admin authentication is MVP-only and uses `ADMIN_LOGIN`, `ADMIN_PASSWORD`, and `JWT_SECRET`.

## Business Rules

Locker selection uses the requested luggage size:

```txt
S  -> S, M, L, XL
M  -> M, L, XL
L  -> L, XL
XL -> XL
```

The backend assigns the smallest available suitable locker.

Fixed prices:

```txt
S  = 5
M  = 7
L  = 10
XL = 15
```

Price is based on the assigned locker size. A user requesting `M` but receiving an `L` locker pays `10`.

Starting storage checks balance before occupying a locker. Finishing storage completes the session, releases the locker, and deducts the assigned locker price in one transaction.

## API Reference

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

Admin locker status changes only allow `AVAILABLE` and `MAINTENANCE`. `OCCUPIED` lockers are released by finishing sessions, not by manual admin changes.

## Operations

Health and metrics:

```sh
curl http://localhost/api/health
curl http://localhost/api/health/db
curl http://localhost/api/metrics
```

Service logs:

```sh
docker compose --env-file .env -f infra/docker-compose.yml logs -f
docker compose --env-file .env -f infra/docker-compose.yml logs --since 1h api
docker compose --env-file .env -f infra/docker-compose.yml logs -f nginx
docker compose --env-file .env -f infra/docker-compose.yml logs -f postgres
docker compose --env-file .env -f infra/docker-compose.yml logs -f tma
docker compose --env-file .env -f infra/docker-compose.yml logs -f admin
docker compose --env-file .env -f infra/docker-compose.yml logs -f display
```

Backup:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > locker-mvp-backup.sql
```

Restore:

```sh
cat locker-mvp-backup.sql | docker compose --env-file .env -f infra/docker-compose.yml exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Do not commit database backups.

## More Detail

- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Implementation plan](docs/implementation-plan.md)
- [Agent rules](AGENTS.md)
