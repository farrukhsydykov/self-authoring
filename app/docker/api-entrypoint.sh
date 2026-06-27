#!/bin/sh
set -e

echo "Running database migrations..."
pnpm exec prisma migrate deploy

echo "Starting API..."
echo "-------------------------------------------"
echo "  Web app:  http://localhost:8080"
echo "  API:      http://localhost:3001 (direct, or /api/ via web)"
echo "-------------------------------------------"
exec node dist/index.js
