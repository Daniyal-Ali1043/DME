#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL to be ready..."
until nc -z db 5432; do
  echo "🕒 Still waiting for PostgreSQL..."
  sleep 2
done

echo "✅ Database is ready! Running migrations..."
# Use drizzle-kit migrate to apply schema changes safely
npx drizzle-kit migrate || echo "⚠️  Migration step skipped or failed, continuing..."

echo "🚀 Starting Next.js app (standalone)..."

# If standalone output exists, start using the built server
if [ -f ".next/standalone/server.js" ]; then
  node .next/standalone/server.js
else
  echo "⚠️  Standalone server.js not found, falling back to 'next start'"
  npm run start
fi
