#!/bin/sh
set -eu

log() {
  printf '%s\n' "$1"
}

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

resolve_database_url() {
  if [ -n "${DATABASE_URL:-}" ]; then
    return 0
  fi
  resolved="$(node -e "
    const { resolveDatabaseUrl } = require('/app/dist/src/config/database-url');
    const url = resolveDatabaseUrl(process.env);
    if (url) process.stdout.write(url);
  " 2>/dev/null || true)"
  if [ -n "$resolved" ]; then
    export DATABASE_URL="$resolved"
    log "Using database URL built from PGHOST/PGUSER/PGPASSWORD/PGDATABASE."
    return 0
  fi
  return 1
}

normalize_database_url() {
  url="$1"
  case "$url" in
    postgresql://*|postgres://*) ;;
    *) fail "DATABASE_URL must start with postgresql:// or postgres://" ;;
  esac

  case "$url" in
    *localhost*|*127.0.0.1*)
      fail "DATABASE_URL points to localhost. On Render, link Postgres to this web service (see RENDER_DEPLOY.md)."
      ;;
  esac

  case "$url" in
    *sslmode=*|*ssl=*)
      printf '%s' "$url"
      ;;
    *render.com*)
      case "$url" in
        *\?*) printf '%s' "${url}&sslmode=require" ;;
        *) printf '%s' "${url}?sslmode=require" ;;
      esac
      ;;
    *)
      printf '%s' "$url"
      ;;
  esac
}

if ! resolve_database_url; then
  fail "DATABASE_URL is not set.

On Render:
  1. Create PostgreSQL (New → PostgreSQL)
  2. Open your WEB service (Docker) → Environment
  3. Add Environment Variable → pick PostgreSQL → select DATABASE_URL
     OR add PGHOST, PGUSER, PGPASSWORD, PGDATABASE from the same menu
  4. Save Changes and wait for redeploy

The variable must be on the web service, not only on the database service."
fi

export DATABASE_URL="$(normalize_database_url "$DATABASE_URL")"

log "Applying database schema..."
attempt=1
max_attempts=30
until npx prisma db push --skip-generate; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    fail "prisma db push failed after ${max_attempts} attempts. Link Postgres to this web service (same region)."
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
