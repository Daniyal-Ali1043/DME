
import { NextResponse } from 'next/server';
import { verifyNowPaymentsSignature } from '@/lib/nowpayments';
import { db } from '@/lib/db';
import { invoices, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { assertWebhookRateLimit, getClientIPFromHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ok() { return new NextResponse('ok', { status: 200 }); }
function bad(msg: string, code = 400) { return new NextResponse(msg, { status: code }); }

type IPNBody = {
  payment_id?: number;
  invoice_id?: number;
  order_id?: string;
  payment_status?: string;
  price_amount?: number;
  price_currency?: string;
  pay_amount?: number;
  pay_currency?: string;
  created_at?: string;
  actually_paid?: number;
};

function toStatus(ipnStatus?: string): 'active' | 'canceled' | 'incomplete' {
  switch ((ipnStatus || '').toLowerCase()) {
    case 'finished':
    case 'confirmed':
      return 'active';
    case 'expired':
    case 'failed':
    case 'rejected':
      return 'canceled';
    default:
      return 'incomplete';
  }
}

function periodEndFor(plan: string) {
  if (plan === 'lifetime') return null;
  const d = new Date(); d.setMonth(d.getMonth() + 1); return d;
}

function parseAllowlist(envVar: string | undefined) {
  return (envVar || '').split(',').map((s) => s.trim()).filter(Boolean);
}
const IP_ALLOWLIST = parseAllowlist(process.env.WEBHOOK_IP_ALLOWLIST);

export async function POST(req: Request) {
  try { await assertWebhookRateLimit(req.headers); } catch (e: any) { return bad('Too Many Requests', e?.status || 429); }

  if (IP_ALLOWLIST.length > 0) {
    const ip = getClientIPFromHeaders(req.headers);
    if (!IP_ALLOWLIST.includes(ip)) return bad('IP not allowed', 403);
  }

  const signature = req.headers.get('x-nowpayments-sig');
  const raw = await req.text();

  if (!verifyNowPaymentsSignature(raw, signature)) return bad('invalid signature');

  let body: IPNBody;
  try { body = JSON.parse(raw); } catch { return bad('invalid json'); }

  const orderId = body.order_id || '';
  const [userId, plan] = orderId.split(':');
  if (!userId || !plan) return bad('missing user/plan metadata');

  const status = toStatus(body.payment_status);
  const extInvoiceId = (body.invoice_id ?? body.payment_id)?.toString() || crypto.randomUUID();

  try {
    await db.insert(invoices).values({
      id: crypto.randomUUID(),
      userId, subscriptionId: null, provider: 'nowpayments',
      externalInvoiceId: String(extInvoiceId),
      amountCents: Math.round((body.price_amount || 0) * 100),
      currency: (body.price_currency || 'USD').toUpperCase(),
      status: status === 'active' ? 'paid' : status === 'canceled' ? 'void' : 'open',
      issuedAt: new Date(),
      paidAt: status === 'active' ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch {}

  try {
    const exists = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.externalSubscriptionId, String(extInvoiceId)),
      columns: { id: true },
    });

    if (exists) {
      await db.update(subscriptions).set({
        status: status === 'active' ? 'active' : status === 'canceled' ? 'canceled' : 'incomplete',
        currentPeriodEnd: periodEndFor(plan),
        updatedAt: new Date(),
      }).where(eq(subscriptions.externalSubscriptionId, String(extInvoiceId)));
    } else {
      await db.insert(subscriptions).values({
        id: crypto.randomUUID(),
        userId, provider: 'nowpayments', plan, priceId: null,
        status: status === 'active' ? 'active' : status === 'canceled' ? 'canceled' : 'incomplete',
        externalCustomerId: null, externalSubscriptionId: String(extInvoiceId),
        currentPeriodEnd: periodEndFor(plan), cancelAtPeriodEnd: false,
        createdAt: new Date(), updatedAt: new Date(),
      });
    }
  } catch (err: any) {
    return bad(`db error: ${err?.message || 'unknown'}`, 500);
  }

  return ok();
}
