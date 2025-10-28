#!/bin/bash

# Cloudflare D1 Database Setup Script
# This script initializes the D1 database with the Prisma schema

set -e

echo "🗄️  Setting up Cloudflare D1 Database..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="audio-text-search-db"
DB_ID="8c33afa3-30ae-4d0d-97b2-6d79395ced34"

echo -e "${BLUE}📋 Database: $DB_NAME${NC}"
echo -e "${BLUE}🆔 ID: $DB_ID${NC}"
echo ""

# Step 1: Generate migration SQL from Prisma schema
echo "📝 Generating migration SQL from Prisma schema..."

# Create migrations directory if it doesn't exist
mkdir -p prisma/migrations/d1

# Generate migration SQL
pnpm prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/d1/init.sql

echo -e "${GREEN}✓ Migration SQL generated${NC}"

# Step 2: Apply migration to local D1
echo ""
echo "🔧 Applying migration to local D1 database..."

wrangler d1 execute $DB_NAME \
  --local \
  --file=prisma/migrations/d1/init.sql

echo -e "${GREEN}✓ Local D1 database initialized${NC}"

# Step 3: Ask if user wants to apply to production
echo ""
read -p "Do you want to apply this migration to PRODUCTION D1? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Applying migration to production D1 database..."
    
    wrangler d1 execute $DB_NAME \
      --remote \
      --file=prisma/migrations/d1/init.sql
    
    echo -e "${GREEN}✓ Production D1 database initialized${NC}"
else
    echo -e "${YELLOW}⚠️  Skipped production migration${NC}"
    echo "To apply to production later, run:"
    echo "wrangler d1 execute $DB_NAME --remote --file=prisma/migrations/d1/init.sql"
fi

# Step 4: Generate NEXTAUTH_SECRET
echo ""
echo "🔐 Generating NEXTAUTH_SECRET..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✓ Generated NEXTAUTH_SECRET${NC}"

# Step 5: Create .env.local for local development
echo ""
read -p "Create .env.local for local development? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat > .env.local <<EOF
# Local development with SQLite
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="http://localhost:3000"

# Optional: ElevenLabs API
# ELEVENLABS_API_KEY="your-key-here"
EOF
    echo -e "${GREEN}✓ Created .env.local${NC}"
    
    # Initialize local SQLite database
    echo "Initializing local SQLite database..."
    pnpm prisma db push
    echo -e "${GREEN}✓ Local SQLite database initialized${NC}"
fi

# Step 6: Create .dev.vars for Wrangler development
echo ""
read -p "Create .dev.vars for Wrangler development? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat > .dev.vars <<EOF
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="http://localhost:8788"
EOF
    echo -e "${GREEN}✓ Created .dev.vars${NC}"
fi

# Display summary
echo ""
echo "================================================"
echo "📋 D1 Database Setup Complete!"
echo "================================================"
echo ""
echo "Local D1: ✅ Initialized"
echo "Database ID: $DB_ID"
echo ""
echo "NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
echo ""
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. For local development (standard Next.js):"
echo "   pnpm dev"
echo ""
echo "2. For local development (with Wrangler):"
echo "   pnpm run cf:dev"
echo ""
echo "3. To deploy to Cloudflare Pages:"
echo "   pnpm run cf:deploy:prod"
echo ""
echo "4. Set environment variables in Cloudflare Dashboard:"
echo "   - NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
echo "   - NEXTAUTH_URL: https://your-project.pages.dev"
echo ""
echo "================================================"
echo -e "${GREEN}✨ Setup complete!${NC}"
