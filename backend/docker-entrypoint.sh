#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Render: New → PostgreSQL, then add DATABASE_URL to this web service Environment."
  exit 1
fi

case "$DATABASE_URL" in
  *localhost*|*127.0.0.1*)
    echo "ERROR: DATABASE_URL points to localhost — it will not work on Render."
    echo "Use the Internal Database URL from your Render Postgres instance."
    exit 1
    ;;
esac

echo "Applying database schema..."
attempt=1
max_attempts=10
until npx prisma db push; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "ERROR: prisma db push failed after $max_attempts attempts."
    echo "Verify Postgres is running and DATABASE_URL is correct (same region as this service)."
    exit 1
  fi
  echo "Database not ready (attempt $attempt/$max_attempts), retrying in 5s..."
  attempt=$((attempt + 1))
  sleep 5
done

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database..."
  timeout 30s npx prisma db seed || echo "Seed skipped (already seeded or unavailable in container)."
fi

exec "$@"
