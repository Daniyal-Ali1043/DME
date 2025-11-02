
# Daily Macro Edge — FinTech Signals Platform

Production-grade Next.js 14 app implementing:
- Stripe (cards) + NOWPayments (crypto) subscriptions
- Auth.js v5 (Google + Email via Postmark) with Drizzle + Vercel Postgres
- Legal acceptance logging (versioned)
- Geofencing, CSP nonces, Upstash rate limits, WAF-friendly headers
- PostHog analytics with Edge proxy
- Pricing, Checkout, Account, Transparency Hub, Providers directory
- Cron jobs: pre-renewal, dunning, weekly transparency PDF
- Public API: /api/public/v1/status, signed /api/events

## Quickstart

1. Copy `.env.example` to `.env.local` and fill values.
2. `npm i`
3. Run migrations: `npm run drizzle:generate` then `npm run drizzle:push`
4. `npm run dev`

Deploy on Vercel. Configure cron in `vercel.json` and set required env vars.

To run docker file 
command : docker compose up --build
