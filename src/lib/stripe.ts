
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { subscriptions, users } from '@/lib/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

export type PlanCode = 'starter' | 'pro' | 'elite' | 'lifetime';

const PRICE_IDS: Record<PlanCode, string> = {
  starter: process.env.STRIPE_PRICE_ID_STARTER || '',
  pro: process.env.STRIPE_PRICE_ID_PRO || '',
  elite: process.env.STRIPE_PRICE_ID_ELITE || '',
  lifetime: process.env.STRIPE_PRICE_ID_LIFETIME || '',
};

for (const [plan, id] of Object.entries(PRICE_IDS)) {
  if (!id) throw new Error(`Missing Stripe price id for plan "${plan}"`);
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  process.env.APP_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

const PORTAL_RETURN_URL = `${APP_URL}/account`;

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'] as const;

export async function getOrCreateStripeCustomer(userId: string) {
  const sub = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.userId, userId), eq(subscriptions.provider, 'stripe')),
    orderBy: [desc(subscriptions.createdAt)],
    columns: { externalCustomerId: true },
  });

  if (sub?.externalCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(sub?.externalCustomerId);
      if (customer && !('deleted' in customer)) return customer;
    } catch {}
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, name: true },
  });

  const customer = await stripe.customers.create({
    email: user?.email || undefined,
    name: user?.name || undefined,
    metadata: { userId },
  });

  return customer;
}

export async function createCheckoutSession(opts: {
  userId: string;
  plan: PlanCode;
  successUrl?: string;
  cancelUrl?: string;
}) {
  const customer = await getOrCreateStripeCustomer(opts.userId);
  const mode = opts.plan === 'lifetime' ? 'payment' : 'subscription';

  const session = await stripe.checkout.sessions.create({
    mode: mode as 'payment' | 'subscription',
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    customer: customer.id,
    success_url: opts.successUrl || `${APP_URL}/account?checkout=success`,
    cancel_url: opts.cancelUrl || `${APP_URL}/pricing?checkout=cancelled`,
    line_items: [{ price: PRICE_IDS[opts.plan], quantity: 1 }],
    metadata: { plan: opts.plan, userId: opts.userId },
  });

  return session;
}

export async function createCustomerPortalSession(userId: string) {
  const active = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.provider, 'stripe'),
      inArray(subscriptions.status, ACTIVE_STATUSES as unknown as string[]),
    ),
    orderBy: [desc(subscriptions.createdAt)],
    columns: { externalCustomerId: true },
  });

  const customerId = active?.externalCustomerId;
  if (!customerId) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: PORTAL_RETURN_URL,
  });

  return session;
}
