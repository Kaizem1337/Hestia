#!/bin/sh
set -e

# Apply any pending database migrations against the (volume-mounted) SQLite DB,
# then hand off to the Next.js standalone server.
echo "[entrypoint] Applying Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Starting Hestia on :${PORT:-3000} ..."
exec node server.js
