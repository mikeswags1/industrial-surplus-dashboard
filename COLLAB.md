# COLLAB — Industrial Surplus Marketing Dashboard

## Project goal

Deliver a **modern internal marketing dashboard** for an industrial surplus buyer/reseller: find companies that may have surplus assets, run **cold email** and **paid social** planning, and track a simple pipeline. Positioning reference (not a design copy): nationwide buyers offering fast quotes, evaluations, strong payouts, and coordinated pickup.

## Current stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 15 App Router + TypeScript |
| Styling | Tailwind CSS v4 (`app/globals.css` + `@theme`) |
| Data (MVP UI) | React context + `localStorage` seed data |
| Database (planned) | Supabase — SQL in `supabase/schema.sql` |
| Email (planned) | Resend |
| AI (optional) | OpenAI via `/api/generate-email`, `/api/generate-ads` |
| Hosting | Vercel (recommended) |

## Tasks completed

- Next.js app structure with route group `(dashboard)` and shared shell (`components/dashboard-shell.tsx`).
- Supabase DDL for `leads` and `campaigns` with triggers and RLS stubs (`supabase/schema.sql`).
- Dashboard pages: Overview, Leads (table + filters + add modal), Campaigns (create + saved cards + demo counters), Email Generator, Ad Scripts, Analytics, Settings.
- API routes for email and ad generation with **template fallback** when `OPENAI_API_KEY` is unset.
- `README.md` with setup; this `COLLAB.md` for handoff.

## Next tasks (suggested order)

1. **Vercel**: import Git repo at [vercel.com/new](https://vercel.com/new) (or `npx vercel link` then `npx vercel --prod`); add env vars from `.env.example` in the Vercel project settings. See `README.md` → **Deploy to Vercel**.
2. **Supabase integration**: server/client data layer; replace `localStorage` with queries; add Supabase Auth and align RLS policies to real roles.
3. **Resend**: API route(s) for single-send and batch with idempotency; store outbound events in Supabase.
4. **OpenAI**: tune prompts, add JSON schema validation (e.g. Zod), log generations per campaign.
5. **Campaign ↔ lead**: join table or filters to attach leads to a campaign; real sent/reply/interested counts from webhooks.
6. **Analytics**: charts + date filters once events exist.
7. **Compliance**: CAN-SPAM / opt-out handling before any bulk cold email.

## Important decisions

- **No overbuild**: charts, auth UI, and real email sends are intentionally deferred; MVP optimizes for navigable UI and clear extension points.
- **Local-first demo**: avoids blocking on Supabase credentials while designers/stakeholders review flows.
- **Industrial visual language**: dark surfaces, restrained accent (`globals.css` theme tokens), minimal motion.
- **Competitor**: studied for *positioning* and SEO patterns only — no cloning of copy or layout.

## Warnings for other AI agents

- **Workspace root**: confirm you are editing the intended repo; this project was bootstrapped from a minimal prior `package.json` — do not assume other unrelated files in the parent tree belong to this app.
- **Do not strip RLS** in production without replacing it with another access model; current policies assume `authenticated` Supabase users.
- **`localStorage` keys**: `isd_leads_v1`, `isd_campaigns_v1` — bump suffix if you change persisted shape to avoid corrupt parses.
- **OpenAI in route handlers**: failures fall back to templates; do not assume API success in UI tests.
- **Legal**: cold email at scale needs process; code does not implement compliance — product owners must own that.
