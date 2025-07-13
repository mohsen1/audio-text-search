# Vercel Deployment Checklist

## Important: Database Provider Change

⚠️ **This project was recently switched from SQLite to PostgreSQL**

**Safe for existing databases**: All tables are prefixed with `audio_search_` to avoid conflicts with existing data in your Neon database. The deployment uses `prisma db push` which safely creates only the needed tables without affecting existing data.

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
   - Create audio-search tables (`./scripts/deploy-db.sh`)
     - Uses `prisma db push` to safely create prefixed tables
     - Won't affect any existing data in your database
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
   - Check that tables were created successfully
   - Verify Prisma client generation in build logs

3. **Authentication issues**
   - Verify `NEXTAUTH_SECRET` is set
   - Check `NEXTAUTH_URL` matches your domain

4. **Table creation issues**
   - The app creates tables with `audio_search_` prefix
   - Existing data in your database will not be affected
   - Check build logs for any permission issues

5. **Build failures**
   - Check Vercel build logs for specific error messages
   - Ensure all environment variables are set correctly

### Build Logs

Check Vercel build logs for:
- Prisma client generation
- Database migration output
- Any build warnings or errors

## Manual Database Setup (if needed)

If you need to set up the database manually:

```bash
# Set your DATABASE_URL
export DATABASE_URL="your-neon-connection-string"

# Generate Prisma client and create tables
pnpm db:generate
pnpm db:push
```
