#!/bin/bash

# Cloudflare Pages Deployment Script for audio-text-search
# This script helps deploy your Next.js app to Cloudflare Pages

set -e

echo "🚀 Deploying to Cloudflare Pages..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if wrangler is authenticated
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ Error: Not authenticated with Cloudflare${NC}"
    echo -e "${YELLOW}Please run: wrangler login${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Wrangler authenticated${NC}"

# Check if DATABASE_URL is set for production
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  Warning: DATABASE_URL not set${NC}"
    echo -e "${YELLOW}Make sure to set it in Cloudflare Dashboard > Pages > Settings > Environment Variables${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
pnpm prisma generate

# Build the Next.js app
echo "🏗️  Building Next.js application..."
pnpm run build

# Check if build was successful
if [ ! -d ".vercel/output/static" ]; then
    echo -e "${RED}❌ Build failed: .vercel/output/static not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"

# Ask for project name (default: audio-text-search)
read -p "Enter Cloudflare Pages project name [audio-text-search]: " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-audio-text-search}

# Deploy to Cloudflare Pages
echo "🚀 Deploying to Cloudflare Pages (project: $PROJECT_NAME)..."
npx wrangler pages deploy .vercel/output/static --project-name="$PROJECT_NAME"

echo -e "${GREEN}✨ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Cloudflare Dashboard:"
echo "   - DATABASE_URL"
echo "   - NEXTAUTH_SECRET"
echo "   - NEXTAUTH_URL"
echo ""
echo "2. Initialize database schema:"
echo "   DATABASE_URL='your-url' pnpm prisma db push"
echo ""
echo "3. Visit your site and test!"
