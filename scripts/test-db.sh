#!/bin/bash

# Database connection test script
echo "🔍 Testing database connection..."

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "Please check your .env file"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo "🔗 Testing connection..."

# Test database connection using prisma
npx prisma db pull --print > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
    echo "📊 Database schema:"
    npx prisma db pull --print
else
    echo "❌ Database connection failed!"
    echo ""
    echo "Common issues:"
    echo "1. Check your DATABASE_URL format"
    echo "2. Ensure your database server is running"
    echo "3. Verify credentials and database name"
    echo "4. Check network connectivity"
fi
