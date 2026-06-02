#!/bin/sh
set -eu

log() {
  printf '%s\n' "$1"
}

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

normalize_database_url() {
  url="$1"
  case "$url" in
    postgresql://*|postgres://*) ;;
    *) fail "DATABASE_URL must start with postgresql:// or postgres://" ;;
  esac

  case "$url" in
    *localhost*|*127.0.0.1*)
      fail "DATABASE_URL points to localhost. Link Render Postgres Internal Database URL to this service."
      ;;
  esac

  case "$url" in
    *render.com*)
      case "$url" in
        *sslmode=*|*ssl=*)
          printf '%s' "$url"
          ;;
        *)
          case "$url" in
            *\?*) printf '%s' "${url}&sslmode=require" ;;
            *) printf '%s' "${url}?sslmode=require" ;;
          esac
          ;;
      esac
      ;;
    *)
      printf '%s' "$url"
      ;;
  esac
}

if [ -z "${DATABASE_URL:-}" ]; then
  fail "DATABASE_URL is not set. Create Render PostgreSQL and add its Internal Database URL to Environment."
fi

export DATABASE_URL="$(normalize_database_url "$DATABASE_URL")"

log "Applying database schema..."
attempt=1
max_attempts=30
until npx prisma db push --skip-generate; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    fail "prisma db push failed after ${max_attempts} attempts. Verify Postgres is running and DATABASE_URL uses the Internal URL (same region)."
  fi
  log "Database not ready (${attempt}/${max_attempts}), retrying in 3s..."
  attempt=$((attempt + 1))
  sleep 3
done
log "Database schema applied."

if [ "${RUN_SEED:-false}" = "true" ]; then
  log "Running database seed..."
  if node dist/prisma/seed.js; then
    log "Seed finished."
  else
    log "Seed skipped or failed (non-fatal if data already exists)."
  fi
fi

log "Starting application..."
exec "$@"
