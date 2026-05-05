# Deployment

This document describes the planned VPS deployment strategy for `locker-mvp`.

The repository is currently at Stage 4: admin backend. The NestJS API, Prisma schema, initial migration, seed script, user/session/locker modules, public read-only endpoints, and JWT-protected admin backend exist under `backend/api`. Docker Compose, Nginx config, and frontend apps have not been implemented yet.

## VPS Assumptions

The VPS should have only these host-level requirements:

- Docker.
- Docker Compose.
- Git.
- Access to the project repository.
- A configured `.env` file with deployment-specific values.

Do not require manual installation of Node.js, npm, PostgreSQL, Prisma, or frontend build tooling on the VPS host.

Application build and runtime must happen inside Docker containers.

## Docker Compose Deployment Strategy

Planned Docker Compose services:

- `postgres`: PostgreSQL database.
- `api`: NestJS backend API.
- `tma`: built Telegram MiniApp frontend.
- `admin`: built admin frontend.
- `display`: built public display frontend.
- `nginx`: public reverse proxy.

Expected future deployment command:

```sh
docker compose -f infra/docker-compose.yml up -d --build
```

Expected future shutdown command:

```sh
docker compose -f infra/docker-compose.yml down
```

The actual Compose file must be created in a later stage at:

```txt
infra/docker-compose.yml
```

When Docker Compose is implemented, this document must be updated with exact service names, volumes, networks, health checks, and commands.

## Planned Nginx Routes

Production should support this routing layout:

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

The planned Nginx config path is:

```txt
infra/nginx/nginx.conf
```

TLS termination may be handled by Nginx or an external VPS-level proxy, but this must be documented when implemented.

## Environment Variables

Planned variables:

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
ADMIN_PUBLIC_API_BASE_URL=/api
DISPLAY_PUBLIC_API_BASE_URL=/api

NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
PUBLIC_DOMAIN=example.com
```

Rules:

- Real secrets must be stored in `.env`, not committed.
- `.env.example` must contain placeholders only.
- Any new variable must be documented in `.env.example`, `README.md`, and this file.
- `ADMIN_LOGIN`, `ADMIN_PASSWORD`, and `JWT_SECRET` are required for Stage 4 admin login and protected admin endpoints.

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

Planned production migration command:

```sh
docker compose -f infra/docker-compose.yml exec api npx prisma migrate deploy
```

Planned development migration command:

```sh
docker compose -f infra/docker-compose.yml exec api npx prisma migrate dev
```

Planned seed command:

```sh
docker compose -f infra/docker-compose.yml exec api npm run db:seed
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

Planned log commands:

```sh
# all services
docker compose -f infra/docker-compose.yml logs -f

# API only
docker compose -f infra/docker-compose.yml logs -f api

# Nginx only
docker compose -f infra/docker-compose.yml logs -f nginx

# PostgreSQL only
docker compose -f infra/docker-compose.yml logs -f postgres
```

Planned restart commands:

```sh
# restart all services
docker compose -f infra/docker-compose.yml restart

# restart API only
docker compose -f infra/docker-compose.yml restart api

# rebuild and restart
docker compose -f infra/docker-compose.yml up -d --build
```

These commands must be verified after Docker Compose is implemented.

## Backup Notes

PostgreSQL data is the critical state for MVP.

Planned backup command:

```sh
docker compose -f infra/docker-compose.yml exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > locker-mvp-backup.sql
```

If shell environment variables are not available on the host, replace them with the actual deployment values.

Backup recommendations:

- Back up before deployments that include migrations.
- Store backups outside the project directory.
- Do not commit database backups to Git.
- Protect backups because they may contain user data.

## Restore Notes

Planned restore flow on a new VPS:

1. Install Docker, Docker Compose, and Git.
2. Clone the repository.
3. Create `.env` from `.env.example`.
4. Start `postgres`.
5. Restore the database dump.
6. Start or restart all services.

Planned restore command:

```sh
cat locker-mvp-backup.sql | docker compose -f infra/docker-compose.yml exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

The exact restore process must be verified after Docker Compose and database services are implemented.

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
