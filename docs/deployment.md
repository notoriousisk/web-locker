# Deployment

This document describes the Docker Compose deployment for `locker-mvp`.

The VPS should have only these host-level requirements:

- Docker.
- Docker Compose.
- Git.
- Access to the project repository.
- A configured `.env` file.

Do not require host-level Node.js, npm, PostgreSQL, Prisma, Vite, or NestJS CLI. Builds and runtime happen inside containers.

## Start The Stack

Create an environment file:

```sh
cp .env.example .env
```

Before production use, replace placeholder secrets in `.env`, especially:

```txt
POSTGRES_PASSWORD
ADMIN_PASSWORD
JWT_SECRET
TELEGRAM_BOT_TOKEN
TMA_JWT_SECRET
```

Start with attached logs:

```sh
./scripts/start-dev.sh
```

The helper runs:

```sh
docker compose --env-file .env -f infra/docker-compose.yml up --build
```

Stop and remove the stack:

```sh
./scripts/stop-dev.sh
```

Run detached for deployment:

```sh
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

Stop detached services:

```sh
docker compose --env-file .env -f infra/docker-compose.yml down
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

Production routing should use:

```txt
https://example.com/tma      -> Telegram MiniApp frontend
https://example.com/admin    -> Admin panel frontend
https://example.com/display  -> Public display frontend
https://example.com/api      -> Backend API
```

The current Compose stack publishes HTTP. Terminate HTTPS with a VPS-level proxy, load balancer, or a documented Nginx TLS update.

## Current VPS HTTP Deployment

The current demo deployment runs on a VPS over plain HTTP with Docker Compose and Nginx:

```txt
http://157.22.199.163/display/  -> Public display frontend
http://157.22.199.163/admin/    -> Admin panel frontend
```

The Telegram MiniApp is tested with the Telegram Test Server Environment bot. This is required for the current HTTP deployment because Telegram's main production environment allows only HTTPS MiniApp URLs.

## Services

- `postgres`: PostgreSQL database with persistent `postgres_data` volume.
- `api`: NestJS backend API.
- `tma`: built Telegram MiniApp static frontend.
- `admin`: built admin static frontend.
- `display`: built public display static frontend.
- `nginx`: public reverse proxy.

The `api` container runs `prisma migrate deploy` before starting the compiled NestJS app. Its health check calls `GET /api/health/db`.

All services share the `locker_mvp` bridge network.

## Nginx

Config path:

```txt
infra/nginx/nginx.conf
```

Routing:

```txt
/api      -> api:3000
/tma      -> tma
/admin    -> admin
/display  -> display
```

Frontend Docker builds use base paths:

```txt
VITE_TMA_BASE_PATH=/tma/
VITE_ADMIN_BASE_PATH=/admin/
VITE_DISPLAY_BASE_PATH=/display/
```

Keep these aligned with Nginx routes.

## Environment Variables

All placeholders are listed in `.env.example`.

Database:

```txt
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
DATABASE_URL
```

API and admin auth:

```txt
API_PORT
ADMIN_LOGIN
ADMIN_PASSWORD
JWT_SECRET
```

Telegram MiniApp auth:

```txt
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

Frontend and routing:

```txt
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

Rules:

- Store real secrets in `.env`; never commit them.
- Keep `.env.example`, `README.md`, and this file aligned when env vars change.
- Keep `TELEGRAM_BOT_TOKEN` backend-only.
- Keep `TMA_DEV_AUTH_ENABLED=false` in production.
- Keep `API_PORT=3000` inside Compose so Nginx can route to the API container.
- Use `NGINX_HTTP_PORT` for the host-facing HTTP port.
- `NGINX_HTTPS_PORT` is reserved unless direct TLS support is added and documented.

## Telegram MiniApp Auth

Production behavior:

- The frontend sends raw `window.Telegram.WebApp.initData` to `POST /api/tma/auth/login`.
- The API validates the Telegram signature with `TELEGRAM_BOT_TOKEN`.
- The API rejects missing, invalid, stale, or tampered `initData`.
- The API returns a short-lived TMA JWT signed with `TMA_JWT_SECRET`.
- TMA user/session routes require `Authorization: Bearer <tma-token>`.

Local browser development may use explicit demo auth:

```txt
TMA_DEV_AUTH_ENABLED=true
```

Use it only outside production.

## Migrations and Seed

Run migrations:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec api npx prisma migrate deploy
```

The API also runs this automatically on container startup.

Seed demo lockers:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec api npm run db:seed
```

Current seed lockers:

```txt
A01 S   A02 S   A03 M   A04 M
B01 L   B02 L   B03 XL  B04 XL
```

Schema changes must use Prisma migrations. Do not manually edit production database structure.

## Logs

All services:

```sh
docker compose --env-file .env -f infra/docker-compose.yml logs -f
docker compose --env-file .env -f infra/docker-compose.yml logs --since 1h
```

Service-specific logs:

```sh
docker compose --env-file .env -f infra/docker-compose.yml logs -f api
docker compose --env-file .env -f infra/docker-compose.yml logs --since 1h api
docker compose --env-file .env -f infra/docker-compose.yml logs -f nginx
docker compose --env-file .env -f infra/docker-compose.yml logs -f postgres
docker compose --env-file .env -f infra/docker-compose.yml logs -f tma
docker compose --env-file .env -f infra/docker-compose.yml logs -f admin
docker compose --env-file .env -f infra/docker-compose.yml logs -f display
```

Restart:

```sh
docker compose --env-file .env -f infra/docker-compose.yml restart
docker compose --env-file .env -f infra/docker-compose.yml restart api
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

## Health and Metrics

```sh
curl http://localhost/api/health
curl http://localhost/api/health/db
curl http://localhost/api/metrics
```

`GET /api/health` checks API liveness. `GET /api/health/db` verifies Prisma/PostgreSQL connectivity and is used by the API container health check. `GET /api/metrics` returns lightweight Prometheus-compatible text metrics.

Observability stays Docker Compose compatible. Do not add Prometheus, Grafana, tracing, a paid platform, Kubernetes, or log pipeline services unless explicitly approved.

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

## Backup

PostgreSQL data is the critical state.

Backup:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > locker-mvp-backup.sql
```

Restore:

```sh
cat locker-mvp-backup.sql | docker compose --env-file .env -f infra/docker-compose.yml exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Recommendations:

- Back up before deployments that include migrations.
- Store backups outside the project directory.
- Do not commit database backups.
- Protect backups because they may contain user data.
