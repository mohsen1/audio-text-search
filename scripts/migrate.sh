#!/bin/bash

# Script to run database migrations manually
# Usage: ./scripts/migrate.sh

echo "Running Prisma migrations..."

# Set the DATABASE_URL if not already set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    echo "Please set your DATABASE_URL before running migrations"
    exit 1
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Apply pending migrations
echo "Applying database migrations..."
npx prisma migrate deploy

echo "✅ Database migrations completed successfully!"

# Optional: Show database status
echo "Current database schema:"
npx prisma db pull --print
