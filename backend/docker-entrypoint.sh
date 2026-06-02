#!/bin/sh
set -eu
node /app/scripts/render-boot.cjs
exec "$@"
