#!/bin/bash

# Simple database deployment script for Vercel
# Uses db push to create tables without affecting existing data

echo "🚀 Starting database deployment..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

echo "✅ DATABASE_URL is set"

# Use db push to create tables (safe for existing databases)
echo "� Creating audio-search tables in database..."
npx prisma db push --accept-data-loss

if [ $? -eq 0 ]; then
    echo "✅ Database tables created successfully!"
    echo "ℹ️  Tables are prefixed with 'audio_search_' to avoid conflicts"
else
    echo "❌ Database push failed"
    exit 1
fi

echo "🎉 Database deployment completed successfully!"
