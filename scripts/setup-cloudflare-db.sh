#!/bin/bash

# Database Setup Helper for Cloudflare Deployment
# This script helps you set up a PostgreSQL database for your Cloudflare Pages deployment

set -e

echo "🗄️  Database Setup for Cloudflare Pages"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "Choose your database provider:"
echo "1) Neon (Recommended - Free tier, serverless PostgreSQL)"
echo "2) Supabase (Free tier, includes auth and storage)"
echo "3) Cloudflare Hyperdrive (Connection pooling for existing PostgreSQL)"
echo "4) I already have a DATABASE_URL"
echo ""

read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo -e "${BLUE}📝 Setting up with Neon${NC}"
        echo ""
        echo "1. Go to https://neon.tech and create a free account"
        echo "2. Create a new project"
        echo "3. Copy the connection string (starts with postgresql://)"
        echo "4. Paste it below"
        echo ""
        read -p "Enter your Neon DATABASE_URL: " DATABASE_URL
        ;;
    2)
        echo -e "${BLUE}📝 Setting up with Supabase${NC}"
        echo ""
        echo "1. Go to https://supabase.com and create a free account"
        echo "2. Create a new project"
        echo "3. Go to Settings > Database"
        echo "4. Copy the Connection String (URI)"
        echo "5. Paste it below"
        echo ""
        read -p "Enter your Supabase DATABASE_URL: " DATABASE_URL
        ;;
    3)
        echo -e "${BLUE}📝 Setting up Cloudflare Hyperdrive${NC}"
        echo ""
        read -p "Enter your existing PostgreSQL connection string: " EXISTING_URL
        echo ""
        echo "Creating Hyperdrive configuration..."
        
        read -p "Enter Hyperdrive name [audio-text-search-db]: " HYPERDRIVE_NAME
        HYPERDRIVE_NAME=${HYPERDRIVE_NAME:-audio-text-search-db}
        
        wrangler hyperdrive create "$HYPERDRIVE_NAME" \
            --connection-string="$EXISTING_URL"
        
        echo ""
        echo -e "${YELLOW}⚠️  Copy the Hyperdrive ID from above and update wrangler.toml${NC}"
        echo ""
        read -p "Enter the Hyperdrive connection string for DATABASE_URL: " DATABASE_URL
        ;;
    4)
        echo -e "${BLUE}📝 Using existing DATABASE_URL${NC}"
        echo ""
        read -p "Enter your DATABASE_URL: " DATABASE_URL
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL is empty${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ DATABASE_URL configured${NC}"
echo ""

# Test database connection
echo "Testing database connection..."
export DATABASE_URL="$DATABASE_URL"

if pnpm prisma db execute --stdin <<< "SELECT 1;" 2>/dev/null; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify database connection${NC}"
    echo "This might be normal if the database doesn't exist yet"
fi

# Ask if user wants to push schema
echo ""
read -p "Do you want to push the Prisma schema to the database now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Pushing Prisma schema to database..."
    pnpm prisma db push
    echo -e "${GREEN}✓ Schema pushed successfully${NC}"
fi

# Generate NEXTAUTH_SECRET
echo ""
echo "Generating NEXTAUTH_SECRET..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✓ Generated NEXTAUTH_SECRET${NC}"

# Save to .dev.vars for local development
echo ""
read -p "Save these to .dev.vars for local development? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat > .dev.vars <<EOF
DATABASE_URL="$DATABASE_URL"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="http://localhost:8788"
EOF
    echo -e "${GREEN}✓ Saved to .dev.vars${NC}"
fi

# Display summary
echo ""
echo "================================================"
echo "📋 Configuration Summary"
echo "================================================"
echo ""
echo "Add these environment variables to Cloudflare Pages:"
echo "(Dashboard > Pages > Your Project > Settings > Environment Variables)"
echo ""
echo "DATABASE_URL:"
echo "$DATABASE_URL"
echo ""
echo "NEXTAUTH_SECRET:"
echo "$NEXTAUTH_SECRET"
echo ""
echo "NEXTAUTH_URL:"
echo "https://your-project.pages.dev (replace with your actual URL)"
echo ""
echo "================================================"
echo ""
echo -e "${GREEN}✨ Database setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Add the environment variables to Cloudflare Pages"
echo "2. Run: pnpm run cf:deploy:prod"
echo "3. Visit your Cloudflare Pages URL and test"
