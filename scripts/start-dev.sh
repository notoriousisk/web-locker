#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "Missing .env. Create it first: cp .env.example .env" >&2
  exit 1
fi

docker compose --env-file .env -f infra/docker-compose.yml up --build
