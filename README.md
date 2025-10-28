# Audio Text Search

Next.js application with audio transcription and search, deployed on Cloudflare Pages with D1 database.

## Features

- 🎵 Audio file upload and transcription
- 🔍 Full-text search across transcripts
- 🗄️ Cloudflare D1 (SQLite) database
- 🔐 Authentication with NextAuth.js
- ⚡ Edge deployment on Cloudflare Pages

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Initialize Database

```bash
./scripts/setup-d1.sh
```

This creates:
- Local SQLite database for development
- Cloudflare D1 database (production)
- Environment files with secrets

### 3. Start Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database

Uses Cloudflare D1 (serverless SQLite):
- **Free tier**: 5GB storage, 5M reads/day
- **Edge-native**: Low latency worldwide
- **No connection pooling needed**

### D1 Commands

```bash
pnpm run d1:backup              # Backup production database
pnpm db:studio                  # Visual database editor
wrangler d1 info audio-text-search-db  # Database info
```

## Deployment

Deploys automatically via GitHub Actions to Cloudflare Pages.

See [DEPLOY.md](./DEPLOY.md) for details.

## Documentation

- [DEPLOY.md](./DEPLOY.md) - Deployment guide
- [D1_SETUP.md](./D1_SETUP.md) - D1 database documentation
- [D1_QUICKSTART.md](./D1_QUICKSTART.md) - Quick reference

