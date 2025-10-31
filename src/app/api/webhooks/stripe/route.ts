
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { invoices, payments, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { assertWebhookRateLimit, getClientIPFromHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ok() { return new NextResponse('ok', { status: 200 }); }
function bad(msg: string, code = 400) { return new NextResponse(msg, { status: code }); }

function toSubStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'trialing':
    case 'active':
    case 'past_due':
    case 'canceled':
    case 'incomplete':
    case 'incomplete_expired':
    case 'unpaid':
      return stripeStatus;
    default:
      return 'active';
  }
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

  const sig = req.headers.get('stripe-signature');
  if (!sig) return bad('Missing stripe-signature');
  if (!process.env.STRGLIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET) return bad('Webhook secret not configured');

  const text = await req.text();

  let event: Stripe.Event;
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRGLIPE_WEBHOOK_SECRET!;
    event = stripe.webhooks.constructEvent(text, sig, secret);
  } catch (err: any) {
    return bad(`Signature verification failed: ${err?.message || 'unknown'}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string | null;
        const subscriptionId = (session.subscription as string) || null;
        const plan = (session.metadata?.plan as string | undefined) || undefined;
        const userId = (session.metadata?.userId as string | undefined) || undefined;

        if (subscriptionId && customerId && plan && userId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
          const status = toSubStatus(sub.status);

          const existing = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.externalSubscriptionId, subscriptionId),
            columns: { id: true },
          });

          if (existing) {
            await db.update(subscriptions).set({
              userId, provider: 'stripe', plan, status,
              externalCustomerId: customerId, currentPeriodEnd,
              cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end), updatedAt: new Date(),
            }).where(eq(subscriptions.externalSubscriptionId, subscriptionId));
          } else {
            await db.insert(subscriptions).values({
              id: crypto.randomUUID(), userId, provider: 'stripe', plan,
              priceId: sub.items?.data?.[0]?.price?.id ?? null,
              status, externalCustomerId: customerId, externalSubscriptionId: subscriptionId,
              currentPeriodEnd, cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
              createdAt: new Date(), updatedAt: new Date(),
            });
          }
        }
        return ok();
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;
        const status = toSubStatus(sub.status);
        const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

        await db.update(subscriptions).set({
          status, currentPeriodEnd,
          cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
          updatedAt: new Date(),
        }).where(eq(subscriptions.externalSubscriptionId, subscriptionId));
        return ok();
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;
        await db.update(subscriptions).set({
          status: 'canceled', canceledAt: new Date(), updatedAt: new Date(),
        }).where(eq(subscriptions.externalSubscriptionId, subscriptionId));
        return ok();
      }
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;

        const extInvoiceId = inv.id;
        const amountCents = inv.amount_paid ?? inv.amount_due ?? 0;
        const currency = (inv.currency || 'usd').toUpperCase();
        const subId = (inv.subscription as string) || null;
        let userId: string | null = null;

        if (subId) {
          const subRow = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.externalSubscriptionId, subId),
            columns: { userId: true, id: true },
          });
          userId = subRow?.userId ?? null;

          if (userId) {
            const existing = await db.query.invoices.findFirst({
              where: eq(invoices.externalInvoiceId, extInvoiceId),
              columns: { id: true },
            });

            if (existing) {
              await db.update(invoices).set({
                status: 'paid', paidAt: new Date(), updatedAt: new Date(),
              }).where(eq(invoices.externalInvoiceId, extInvoiceId));
            } else {
              await db.insert(invoices).values({
                id: crypto.randomUUID(), userId, subscriptionId: subRow?.id ?? null,
                provider: 'stripe', externalInvoiceId: extInvoiceId,
                amountCents, currency, status: 'paid',
                issuedAt: new Date(), paidAt: new Date(),
                createdAt: new Date(), updatedAt: new Date(),
              });
            }
          }
        }
        return ok();
      }
      default:
        return ok();
    }
  } catch (err: any) {
    return bad(`Unhandled error: ${err?.message || 'unknown'}`, 500);
  }
}
