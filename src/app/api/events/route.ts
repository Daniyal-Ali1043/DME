
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { captureServerEvent, type AnalyticsEvent } from '@/lib/analytics';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SECRET = process.env.EVENTS_API_SECRET || '';
if (!SECRET) {
  if (process.env.NODE_ENV === 'production') throw new Error('EVENTS_API_SECRET is not set');
}

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
  : null;

const ALLOWED_EVENTS: Set<AnalyticsEvent> = new Set(['user_signed_up','subscription_started','subscription_cancelled','page_viewed','legal_accepted']);

function hmac(body: string, ts: string) {
  const mac = crypto.createHmac('sha256', SECRET); mac.update(`${ts}.${body}`, 'utf8'); return mac.digest('hex');
}
function bad(message: string, code = 400) { return NextResponse.json({ ok: false, error: message }, { status: code }); }

export async function POST(req: Request) {
  const ts = req.headers.get('x-dme-timestamp');
  const sig = req.headers.get('x-dme-signature');
  const idem = req.headers.get('idempotency-key');

  if (!SECRET) return bad('Service not configured', 503);
  if (!ts || !sig) return bad('Missing signature headers', 401);
  if (!idem) return bad('Missing Idempotency-Key', 400);

  const now = Math.floor(Date.now() / 1000);
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > 300) return bad('Stale or invalid timestamp', 401);

  const raw = await req.text();
  const expect = hmac(raw, ts);
  if (sig.trim().toLowerCase() !== expect) return bad('Invalid signature', 401);

  let json: { event?: string; distinctId?: string; properties?: Record<string, unknown> } = {};
  try { json = JSON.parse(raw); } catch { return bad('Invalid JSON', 400); }

  const event = (json.event || '').trim() as AnalyticsEvent;
  const distinctId = (json.distinctId || '').trim();
  if (!event || !ALLOWED_EVENTS.has(event)) return bad('Unsupported or missing event', 422);
  if (!distinctId) return bad('Missing distinctId', 422);

  if (!redis) return bad('KV not configured for idempotency', 503);
  const key = `events:idemp:${idem}`;
  const set = await redis.set<string>(key, '1', { nx: true, ex: 60 * 60 * 24 });
  if (set === null) return NextResponse.json({ ok: true, idempotent: true });

  await captureServerEvent({ distinctId, event, properties: json.properties || {} });
  return NextResponse.json({ ok: true, idempotent: false });
}
