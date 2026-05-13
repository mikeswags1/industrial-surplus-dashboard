# Industrial Surplus — Marketing Dashboard

Internal MVP dashboard for discovering surplus sellers, planning cold email and paid social outreach, and tracking a lightweight pipeline. Built for an industrial buying/reselling operator (not a public marketing site).

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (schema in `supabase/schema.sql`; client helper in `lib/supabase/client.ts`)
- **OpenAI** (optional) for `/api/generate-email` and `/api/generate-ads`
- **Google Places API** for real-source Lead Finder searches
- **Resend** (dependency only for now — wire sends in a follow-up)
- **Vercel** (recommended hosting)

## Prerequisites

- Node.js 20+
- npm (or pnpm/yarn if you adapt commands)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy the example file and fill in values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Purpose |
   |----------|---------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe anon key |
   | `OPENAI_API_KEY` | Enables AI-generated email/ad copy (otherwise templates run) |
   | `GOOGLE_PLACES_API_KEY` | Enables Lead Finder real provider search (server-only) |
   | `RESEND_API_KEY` | Reserved for transactional email sending |

   For Lead Finder, create a Google Cloud API key with the Places API enabled and billing active, then store it as `GOOGLE_PLACES_API_KEY` only on the server / Vercel environment.

3. **Database**

   In the Supabase SQL editor, run `supabase/schema.sql`, then migrations in order from `supabase/migrations/`. When Row Level Security is enabled, connect the app with Supabase Auth (or use the service role from trusted server routes only).

4. **Development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

5. **Production build**

   ```bash
   npm run build
   npm start
   ```

## Publish to GitHub (local script)

The agent environment here cannot run `git`/`gh` for you. On your machine, open PowerShell **in the project root** (the folder that contains `package.json` and `app/`), then:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish-github.ps1 -Push
```

That copies the app into a **clean** folder next to your project’s parent directory (for example `C:\Users\industrial-surplus-dashboard` when the app currently lives under `C:\Users\User`), commits, sets **`origin`** to [github.com/mikeswags1/industrial-surplus-dashboard](https://github.com/mikeswags1/industrial-surplus-dashboard), and runs **`git push -u origin main`**. If GitHub asks for credentials, use a [personal access token](https://github.com/settings/tokens) with `repo` scope as the password (HTTPS).

To copy only without pushing, omit `-Push`.

## MVP behavior

- **Leads** and **campaigns** persist through Supabase-backed server API routes when server env vars are configured.
- **Lead Finder** uses Google Places for real company candidates, optional website enrichment, and AI/heuristic scoring before user approval into leads. It never creates fake sample leads.
- **AI routes** return deterministic templates when `OPENAI_API_KEY` is missing.
- **Collaboration** notes for agents live in `COLLAB.md`.

## Deploy to Vercel

Vercel auto-detects Next.js; no `vercel.json` is required for a standard deploy. Pick **one** path below.

### Option A — GitHub / GitLab / Bitbucket (recommended)

Continuous deploys on every push to your main branch.

1. **Put the app in a Git repo** (if it is not already):

   ```bash
   git init
   git add .
   git commit -m "Initial industrial surplus dashboard"
   ```

   Create an empty repository on GitHub (or GitLab / Bitbucket), then:

   ```bash
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

2. **Import on Vercel**

   - Open [vercel.com/new](https://vercel.com/new).
   - Sign in with the same account you use for Vercel.
   - **Add New… → Project** → **Import** your repository.
   - **Framework Preset**: Next.js (default).
   - **Root Directory**: leave as `.` unless the app lives in a subfolder.
   - Click **Deploy** (first build may take a minute).

3. **Environment variables** (Project → **Settings** → **Environment Variables**)

   Add the same names as in `.env.example`. Use **Production** (and **Preview** if you want AI on preview URLs too):

   | Name | Environments | Notes |
   |------|----------------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Optional until Supabase is wired |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Optional until Supabase is wired |
   | `OPENAI_API_KEY` | Production, Preview | Optional; templates run if empty |
   | `GOOGLE_PLACES_API_KEY` | Production, Preview | Required for Lead Finder real searches |
   | `RESEND_API_KEY` | Production | Optional until email send is implemented |

   Redeploy after adding variables (**Deployments** → … on latest → **Redeploy**), or push a new commit.

### Option B — Vercel CLI (no Git, or quick first deploy)

From the project root (where `package.json` is):

```bash
npm install
npx vercel login
npx vercel link          # follow prompts: scope + project name (or create new)
npx vercel               # preview URL
npx vercel --prod        # production
```

The CLI will prompt for environment variables on first deploy, or you can add them in the Vercel dashboard afterward.

### After deploy

- **Production URL**: shown in the dashboard and after `vercel --prod`.
- **Preview URLs**: every branch/PR gets a unique URL when Git is connected.
- **Build failures**: check the **Build Logs** tab on the failed deployment; common issues are missing `npm install`, Node version (Vercel defaults are fine for Next 15), or invalid env var names.

For server-side Supabase later, prefer the **pooler** connection string in server-only env vars (`SUPABASE_SERVICE_ROLE_KEY` must never be `NEXT_PUBLIC_*`).
