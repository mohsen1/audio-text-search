# Vercel Deployment Checklist

## Important: Database Provider Change

⚠️ **This project was recently switched from SQLite to PostgreSQL**

The migration history has been reset to accommodate the database provider change. The old SQLite migrations have been removed, and a new PostgreSQL migration will be created on first deployment.

## Prerequisites

- [ ] Neon PostgreSQL database created
- [ ] Database URL copied from Neon dashboard
- [ ] Repository connected to Vercel

## Environment Variables

Set these in your Vercel project settings:

### Required
- [ ] `DATABASE_URL` - Your Neon PostgreSQL connection string
- [ ] `NEXTAUTH_SECRET` - Random secret for NextAuth (use `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` - Your production URL (e.g., `https://your-app.vercel.app`)

### Optional
- [ ] `ELEVENLABS_API_KEY` - If using ElevenLabs integration

## Deployment Steps

1. **Push your code** to the main branch
2. **Vercel will automatically**:
   - Install dependencies (`pnpm install`)
   - Generate Prisma client (`prisma generate`)
   - Run database migrations (`prisma migrate deploy`)
   - Build the Next.js app (`next build`)
   - Deploy to production

## Post-Deployment

- [ ] Test the deployed application
- [ ] Verify database connection
- [ ] Check that authentication works
- [ ] Test file upload functionality
- [ ] Monitor for any runtime errors

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Verify `DATABASE_URL` is correctly set
   - Ensure Neon database is accessible

2. **Prisma client errors**
   - Check that migrations ran successfully
   - Verify Prisma client generation in build logs

3. **Authentication issues**
   - Verify `NEXTAUTH_SECRET` is set
   - Check `NEXTAUTH_URL` matches your domain

### Build Logs

Check Vercel build logs for:
- Prisma client generation
- Database migration output
- Any build warnings or errors

## Manual Migration (if needed)

If you need to run migrations manually:

```bash
# Set your DATABASE_URL
export DATABASE_URL="your-neon-connection-string"

# Run migrations
./scripts/migrate.sh
```
