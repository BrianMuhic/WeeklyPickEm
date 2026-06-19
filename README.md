# WeeklyPickEm

Pick winners in NFL, ACC, SEC, and Big Ten football leagues. Compete weekly and climb the season leaderboard.

## Features

- User auth: sign up (name, email, username), login, password reset
- Leagues: create or join public/private leagues
- Multi-sport: NFL, ACC, SEC, Big Ten
- Cross-conference games appear in any league where either team belongs to that conference
- ESPN API integration for schedules and live scores
- Weekly leaderboard (1 point per correct pick)
- Season leaderboard (weekly wins; ties for 1st all count as a win)
- Admin panel for leagues, players, and picks

## Tech Stack

- Next.js 16 (App Router)
- PostgreSQL + Prisma
- iron-session + bcrypt

## Quick Start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

The app uses port **5433** to avoid conflicting with a local PostgreSQL install on port 5432.

### 2. Configure environment

Copy `.env.example` to `.env` and update values as needed.

### 3. Run migrations

```bash
npm run db:migrate
```

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Admin access

Set `ADMIN_EMAILS` in `.env` to a comma-separated list of admin email addresses. Users who register with those emails receive admin privileges.

## Password Reset

In development, reset links are logged to the server console. For production, set `RESEND_API_KEY` and `EMAIL_FROM`.

## Deploy to Vercel + Neon

### 1. Create a Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. Copy both connection strings from the dashboard:
   - **Pooled** → `DATABASE_URL` (hostname includes `-pooler`)
   - **Direct** → `DIRECT_URL` (used for migrations during build)

### 2. Deploy on Vercel

1. Push this repo to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Add these environment variables in Vercel **before** the first deploy:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon **pooled** connection string |
| `DIRECT_URL` | Neon **direct** connection string |
| `SESSION_SECRET` | Random string, at least 32 characters |
| `ADMIN_EMAILS` | Your admin email(s), comma-separated |
| `APP_URL` | Your Vercel URL, e.g. `https://weeklypickem.vercel.app` |

4. Deploy. The build runs `prisma migrate deploy` automatically to set up the schema.

### 3. Custom domain (optional)

In Vercel → Project → Settings → Domains, add your domain and follow the DNS instructions. Then update `APP_URL` to match.

### 4. Password reset email (optional)

Sign up at [resend.com](https://resend.com), verify your domain, and add `RESEND_API_KEY` and `EMAIL_FROM` in Vercel.
