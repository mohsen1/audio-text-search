#!/bin/bash

# This script runs during Vercel build to set up the database
echo "Setting up database..."

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

echo "Database setup complete!"
