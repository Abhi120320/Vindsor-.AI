#!/bin/sh
set -e

echo "Applying database schema..."
npx prisma db push

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database..."
  timeout 30s npx prisma db seed || echo "Seed skipped (already seeded or unavailable in container)."
fi

exec "$@"
