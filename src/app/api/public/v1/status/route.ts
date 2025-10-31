
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { sql, inArray } from 'drizzle-orm';
import { assertWebhookRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ok(json: unknown, headers?: HeadersInit) { return NextResponse.json(json, { status: 200, headers }); }
function err(message: string, code = 500) { return NextResponse.json({ status: 'error', error: message }, { status: code }); }

async function ensureTransparencyTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS transparency_reports (
      id TEXT PRIMARY KEY,
      year INT NOT NULL,
      week INT NOT NULL,
      pdf_base64 TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (year, week)
    );
  `);
}

export async function GET(req: Request) {
  try { await assertWebhookRateLimit(req.headers); } catch (e: any) { return err('Too Many Requests', e?.status || 429); }
  const start = Date.now();

  const blocked = (process.env.BLOCKED_COUNTRIES || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const services: Record<string, { ok: boolean; detail?: string }> = {
    db: { ok: false },
    stripe: { ok: Boolean(process.env.STRIPE_SECRET_KEY) },
    nowpayments: { ok: Boolean(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET) },
    posthog: { ok: Boolean(process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY) },
    postmark: { ok: Boolean(process.env.POSTMARK_SERVER_TOKEN && process.env.POSTMARK_FROM_EMAIL) },
  };

  let activeSubs = 0;
  let latestReport: { year: number; week: number; created_at: string } | null = null;

  try {
    await db.execute(sql`SELECT 1;`);
    services.db.ok = true;

    const ACTIVE = ['active', 'trialing'] as const;
    const rows = await db.select({ count: sql<number>`COUNT(*)` }).from(subscriptions).where(inArray(subscriptions.status, ACTIVE as unknown as string[]));
    activeSubs = Number(rows?.[0]?.count || 0);

    await ensureTransparencyTable();
    const rep = await db.execute(sql`SELECT year, week, created_at FROM transparency_reports ORDER BY year DESC, week DESC LIMIT 1;`);
    const r = (rep.rows as any[])[0];
    if (r) latestReport = { year: Number(r.year), week: Number(r.week), created_at: new Date(r.created_at).toISOString() };
  } catch (e: any) {
    services.db.ok = false;
    services.db.detail = e?.message || 'unknown';
  }

  const body = {
    status: 'ok',
    time: new Date().toISOString(),
    latency_ms: Date.now() - start,
    version: process.env.NEXT_PUBLIC_APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
    regions_blocked: blocked,
    services, metrics: { active_subscriptions: activeSubs, latest_transparency_report: latestReport },
  };
  return ok(body, { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60', 'X-Robots-Tag': 'noindex, nofollow, noarchive' });
}
