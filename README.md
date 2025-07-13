This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Database Setup

This project uses PostgreSQL with Prisma. You have two options:

#### Option A: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database: `createdb audio_text_search_dev`
3. Update `.env` with your local connection string:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/audio_text_search_dev"
   ```

#### Option B: Neon (Recommended)
1. Create a free account at [Neon](https://neon.tech)
2. Create a new project and database
3. Copy the connection string to your `.env` file

### 3. Initialize Database

Run the development setup script:

```bash
./scripts/dev-setup.sh
```

Or manually:

```bash
pnpm db:generate
pnpm db:push
```

### 4. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Authentication

This app uses [NextAuth.js](https://next-auth.js.org) for passwordless email authentication.

### Setup

Install the required packages:

```bash
pnpm add next-auth @next-auth/prisma-adapter
```

Copy the example environment file and fill in your settings:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and configure the following variables:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your-secret>

EMAIL_SERVER=smtp://USER:PASSWORD@HOST:PORT
EMAIL_FROM=no-reply@your-domain.com
```

Sign-in is available at [http://localhost:3000/signin](http://localhost:3000/signin).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Database Setup

This project uses Prisma with PostgreSQL. For development, you can use a local PostgreSQL instance, and for production, we recommend using [Neon](https://neon.tech).

### Development Setup

1. Copy the environment file:
```bash
cp .env.example .env.local
```

2. Set up your database URL in `.env.local`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/audio_text_search"
```

3. Run migrations:
```bash
pnpm run db:migrate
```

### Production Setup with Neon

1. Create a new project at [Neon](https://neon.tech)
2. Copy the connection string from your Neon dashboard
3. Add it to your Vercel environment variables as `DATABASE_URL`

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

### Deployment Steps

1. **Connect your repository** to Vercel
2. **Set environment variables** in your Vercel project settings:
   - `DATABASE_URL` - Your Neon PostgreSQL connection string
   - `NEXTAUTH_URL` - Your production URL (e.g., `https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET` - A random secret for NextAuth.js
3. **Deploy** - Vercel will automatically run migrations during build

### Environment Variables Required

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-secret-here"
```

The build process will automatically:
- Generate the Prisma client
- Run database migrations
- Build the Next.js application

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
