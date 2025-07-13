#!/bin/bash

# Manual database baseline script
# Use this if you need to manually baseline an existing production database

echo "🎯 Manual Database Baseline Setup"
echo "=================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

echo "✅ DATABASE_URL is set"

# Generate Prisma client first
echo "📦 Generating Prisma client..."
npx prisma generate

# Check current database state
echo "🔍 Checking current database state..."
npx prisma db pull --print > current_schema.prisma 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to database. Please check your DATABASE_URL"
    exit 1
fi

echo "✅ Database connection successful"

# Create baseline migration
echo "📝 Creating baseline migration..."
timestamp=$(date +"%Y%m%d%H%M%S")
migration_name="${timestamp}_baseline"
migration_dir="prisma/migrations/${migration_name}"

mkdir -p "$migration_dir"

# Generate migration SQL
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > "${migration_dir}/migration.sql"

if [ -s "${migration_dir}/migration.sql" ]; then
    echo "✅ Migration file created: ${migration_dir}/migration.sql"
    
    # Mark migration as applied (since database already has the schema)
    echo "🏷️  Marking migration as already applied..."
    npx prisma migrate resolve --applied "$migration_name"
    
    if [ $? -eq 0 ]; then
        echo "✅ Baseline migration completed successfully!"
        echo ""
        echo "Your database is now ready for future migrations."
        echo "You can run 'prisma migrate dev' for new schema changes."
    else
        echo "❌ Failed to mark migration as applied"
        exit 1
    fi
else
    echo "ℹ️  No migration needed - database schema matches Prisma schema"
    rmdir "$migration_dir" 2>/dev/null
fi

# Clean up
rm -f current_schema.prisma

echo "🎉 Database baseline setup complete!"
