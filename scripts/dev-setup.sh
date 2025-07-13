#!/bin/bash

# Development setup script for PostgreSQL
echo "🚀 Setting up development database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo ""
    echo "Please update your .env file with a valid PostgreSQL connection string:"
    echo ""
    echo "For local PostgreSQL:"
    echo "DATABASE_URL=\"postgresql://username:password@localhost:5432/audio_text_search_dev\""
    echo ""
    echo "For Neon (development database):"
    echo "DATABASE_URL=\"postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require\""
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL is set"

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Create tables using db push (safe for existing databases)
echo "🗄️  Creating audio-search tables..."
npx prisma db push

echo "✅ Development database setup complete!"
echo "ℹ️  Tables are prefixed with 'audio_search_' to avoid conflicts"
echo ""
echo "You can now run:"
echo "  pnpm dev          # Start development server"
echo "  pnpm db:studio    # Open Prisma Studio"
