# 🚀 Deployment Guide

## Auto-Deploy via GitHub Actions

Pushes to `main` branch automatically deploy to Cloudflare Pages.

### Setup (One-time)

Required secrets in GitHub repository:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Pages permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `NEXTAUTH_SECRET` - Your NextAuth secret

### How it Works

1. Push to `main` branch
2. GitHub Actions builds the app
3. Deploys to Cloudflare Pages
4. D1 database automatically bound

**Production URL**: `https://audio-text-search.pages.dev`

---

## Manual Deploy

```bash
pnpm run cf:build
wrangler pages deploy
```

---

## Database

**D1 Database**: `audio-text-search-db`
- ID: `8c33afa3-30ae-4d0d-97b2-6d79395ced34`
- Status: ✅ Initialized

### Commands

```bash
# Backup
pnpm run d1:backup

# Query
wrangler d1 execute audio-text-search-db --remote \
  --command="SELECT COUNT(*) FROM audio_search_users"

# Info
wrangler d1 info audio-text-search-db
```

---

## Environment Variables

**GitHub Secrets** (for CI/CD):
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXTAUTH_SECRET`

**Cloudflare Pages** (set in dashboard):
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

---

## Troubleshooting

### Build fails
Check GitHub Actions logs

### D1 not connected
Verify D1 binding in Cloudflare Pages settings

### Auth not working
Check `NEXTAUTH_URL` matches your domain
