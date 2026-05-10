# Deployment

This document describes the VPS deployment strategy for `locker-mvp`.

The repository is currently at Stage 9: final verification, cleanup, and start instructions. The NestJS backend exists under `backend/api`, the user-facing React + Vite Telegram MiniApp exists under `apps/tma`, the React + Vite admin frontend exists under `apps/admin`, the React + Vite public display frontend exists under `apps/display`, Docker Compose/Nginx deployment files exist under `infra`, and helper scripts exist under `scripts`.

## VPS Assumptions

The VPS should have only these host-level requirements:

- Docker.
- Docker Compose.
- Git.
- Access to the project repository.
- A configured `.env` file with deployment-specific values.

Do not require manual installation of Node.js, npm, PostgreSQL, Prisma, or frontend build tooling on the VPS host.

Application build and runtime must happen inside Docker containers.

## How To Start The Whole Project

The full MVP runs through Docker Compose.

Create an environment file:

```sh
cp .env.example .env
```

Before production use, edit `.env` and replace placeholder secrets, especially `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, and `JWT_SECRET`.

Start the full stack with attached logs:

```sh
./scripts/start-dev.sh
```

The helper runs:

```sh
docker compose --env-file .env -f infra/docker-compose.yml up --build
```

Press `Ctrl+C` to stop the attached Compose run. To stop and remove the stack explicitly:

```sh
./scripts/stop-dev.sh
```

The stop helper runs:

```sh
docker compose --env-file .env -f infra/docker-compose.yml down
```

Expected local URLs:

```txt
http://localhost/api/health
http://localhost/tma
http://localhost/admin
http://localhost/display
```

Restart all services:

```sh
docker compose --env-file .env -f infra/docker-compose.yml restart
```

View logs:

```sh
docker compose --env-file .env -f infra/docker-compose.yml logs -f
```

Run migrations manually:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec api npx prisma migrate deploy
```

The `api` service also runs `prisma migrate deploy` automatically on container start.

Seed deterministic demo lockers:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec api npm run db:seed
```

## Docker Compose Deployment Strategy

Docker Compose services:

- `postgres`: PostgreSQL database.
- `api`: NestJS backend API.
- `tma`: built Telegram MiniApp frontend.
- `admin`: built admin frontend.
- `display`: built public display frontend.
- `nginx`: public reverse proxy.

Deployment command:

```sh
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

Shutdown command:

```sh
docker compose --env-file .env -f infra/docker-compose.yml down
```

The Compose file is:

```txt
infra/docker-compose.yml
```

Service details:

- `postgres`: `postgres:16-alpine`, persistent `postgres_data` volume, `pg_isready` health check.
- `api`: builds `backend/api/Dockerfile`, reads `.env`, waits for healthy PostgreSQL, runs `prisma migrate deploy`, then starts `node dist/main.js` on container port `3000`.
- `tma`: builds `apps/tma/Dockerfile` and serves the built Vite app under `/tma/`.
- `admin`: builds `apps/admin/Dockerfile` and serves the built Vite app under `/admin/`.
- `display`: builds `apps/display/Dockerfile` and serves the built Vite app under `/display/`.
- `nginx`: `nginx:1.27-alpine`, mounts `infra/nginx/nginx.conf`, publishes `${NGINX_HTTP_PORT:-80}:80`.
- All services share the `locker_mvp` bridge network.

## Nginx Routes

Production supports this routing layout:

```txt
https://example.com/tma      -> Telegram MiniApp frontend
https://example.com/admin    -> Admin panel frontend
https://example.com/display  -> Public display frontend
https://example.com/api      -> Backend API
```

Nginx responsibilities:

- Route `/api` to the backend API container.
- Route `/tma` to the Telegram MiniApp frontend.
- Route `/admin` to the admin frontend.
- Route `/display` to the public display frontend.
- Support SPA fallback for frontend routes.
- Preserve API paths under `/api`.

The Nginx config path is:

```txt
infra/nginx/nginx.conf
```

This MVP config serves HTTP on container port `80`. TLS can be terminated by a VPS-level proxy, load balancer, or a later Nginx TLS update; document that choice before enabling HTTPS directly in this repository.

## Environment Variables

Variables:

```txt
POSTGRES_DB=locker_mvp
POSTGRES_USER=locker
POSTGRES_PASSWORD=change-me
DATABASE_URL=postgresql://locker:change-me@postgres:5432/locker_mvp?schema=public

API_PORT=3000

ADMIN_LOGIN=admin
ADMIN_PASSWORD=change-me
JWT_SECRET=change-me

TMA_PUBLIC_API_BASE_URL=/api
VITE_TMA_API_BASE_URL=/api
VITE_TMA_BASE_PATH=/tma/
ADMIN_PUBLIC_API_BASE_URL=/api
VITE_ADMIN_API_BASE_URL=/api
VITE_ADMIN_BASE_PATH=/admin/
DISPLAY_PUBLIC_API_BASE_URL=/api
VITE_DISPLAY_API_BASE_URL=/api
VITE_DISPLAY_BASE_PATH=/display/

NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
PUBLIC_DOMAIN=example.com
```

Rules:

- Real secrets must be stored in `.env`, not committed.
- `.env.example` must contain placeholders only.
- Any new variable must be documented in `.env.example`, `README.md`, and this file.
- `ADMIN_LOGIN`, `ADMIN_PASSWORD`, and `JWT_SECRET` are required for Stage 4 admin login and protected admin endpoints.
- `API_PORT` is fixed to `3000` inside Docker Compose so Nginx can route to the API service. Change `NGINX_HTTP_PORT` to alter the host-facing HTTP port.
- `VITE_TMA_API_BASE_URL` is used by the Stage 5 Vite TMA build. The default routed value is `/api`.
- `VITE_ADMIN_API_BASE_URL` is used by the Stage 6 Vite admin build. The default routed value is `/api`.
- `VITE_DISPLAY_API_BASE_URL` is used by the Stage 7 Vite public display build. The default routed value is `/api`.
- `VITE_TMA_BASE_PATH`, `VITE_ADMIN_BASE_PATH`, and `VITE_DISPLAY_BASE_PATH` are used by production Vite builds so static assets resolve under `/tma/`, `/admin/`, and `/display/`.
- `NGINX_HTTPS_PORT` is reserved for a later direct-TLS Nginx setup. The current Compose file publishes HTTP only and expects HTTPS to be terminated outside this container stack if needed.

## Telegram MiniApp Build Notes

Current local TMA commands:

```sh
cd apps/tma
npm install
npm run dev
npm run build
```

For local development, `apps/tma/vite.config.ts` proxies `/api` to `http://localhost:3000`. In VPS deployment, the TMA Docker image builds with `VITE_TMA_BASE_PATH=/tma/`, serves static files through Nginx, and the public reverse proxy routes `/tma` to that container.

## Admin Frontend Build Notes

Current local admin commands:

```sh
cd apps/admin
npm install
npm run dev
npm run build
```

For local development, `apps/admin/vite.config.ts` proxies `/api` to `http://localhost:3000`. In VPS deployment, the admin Docker image builds with `VITE_ADMIN_BASE_PATH=/admin/`, serves static files through Nginx, and the public reverse proxy routes `/admin` to that container.

## Public Display Frontend Build Notes

Current local display commands:

```sh
cd apps/display
npm install
npm run dev
npm run build
```

For local development, `apps/display/vite.config.ts` proxies `/api` to `http://localhost:3000`. In VPS deployment, the display Docker image builds with `VITE_DISPLAY_BASE_PATH=/display/`, serves static files through Nginx, and the public reverse proxy routes `/display` to that container.

## Migration and Seed Strategy

Database schema changes must use Prisma migrations.

Current migration:

```txt
backend/api/prisma/migrations/20260501000000_init/migration.sql
```

Current seed script:

```txt
backend/api/prisma/seed.ts
```

The backend Prisma config is:

```txt
backend/api/prisma.config.ts
```

Local backend commands:

```sh
cd backend/api
npm install
npm run prisma:generate

# requires DATABASE_URL and a running PostgreSQL database
npm run prisma:migrate:dev
npm run db:seed
```

Stage 3 local API verification requires a running PostgreSQL database because the core flows use the real database through Prisma. There is no mock or in-memory backend mode.

Production migration command:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec api npx prisma migrate deploy
```

Development migration command:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec api npx prisma migrate dev
```

Seed command:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec api npm run db:seed
```

Seed data should include test lockers with different sizes and grid positions.

Current seed data creates eight test lockers:

```txt
A01 S   A02 S   A03 M   A04 M
B01 L   B02 L   B03 XL  B04 XL
```

Migration rules:

- Do not manually edit production database schema.
- Do not deploy schema changes without migrations.
- Do not add payment transaction tables in MVP.
- Update documentation after every schema, migration, or seed change.

## Logs and Restart Commands

Log commands:

```sh
# all services
docker compose --env-file .env -f infra/docker-compose.yml logs -f

# API only
docker compose --env-file .env -f infra/docker-compose.yml logs -f api

# Nginx only
docker compose --env-file .env -f infra/docker-compose.yml logs -f nginx

# PostgreSQL only
docker compose --env-file .env -f infra/docker-compose.yml logs -f postgres
```

Restart commands:

```sh
# restart all services
docker compose --env-file .env -f infra/docker-compose.yml restart

# restart API only
docker compose --env-file .env -f infra/docker-compose.yml restart api

# rebuild and restart
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

The `api` service also runs `prisma migrate deploy` automatically on container start.

## Backup Notes

PostgreSQL data is the critical state for MVP.

Backup command:

```sh
docker compose --env-file .env -f infra/docker-compose.yml exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > locker-mvp-backup.sql
```

If shell environment variables are not available on the host, replace them with the actual deployment values.

Backup recommendations:

- Back up before deployments that include migrations.
- Store backups outside the project directory.
- Do not commit database backups to Git.
- Protect backups because they may contain user data.

## Restore Notes

Restore flow on a new VPS:

1. Install Docker, Docker Compose, and Git.
2. Clone the repository.
3. Create `.env` from `.env.example`.
4. Start `postgres`.
5. Restore the database dump.
6. Start or restart all services.

Restore command:

```sh
cat locker-mvp-backup.sql | docker compose --env-file .env -f infra/docker-compose.yml exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Run restore commands only after `postgres` is healthy and before exposing a restored production instance to users.

## What Should Not Be Installed Manually on the VPS

Do not manually install these as deployment prerequisites:

- Node.js.
- npm.
- pnpm.
- NestJS CLI.
- Vite.
- Prisma CLI.
- PostgreSQL server.
- Nginx for app routing, unless the deployment explicitly uses host-level Nginx and documents why.

The default MVP deployment path is containerized through Docker Compose.
