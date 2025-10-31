import { auth } from '@/auth';
import { createCheckoutSession } from '@/lib/stripe';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function toPlanCode(p?: string) {
  // Handle undefined safely and normalize casing once
  const plan = (p ?? '').toLowerCase();

  switch (plan) {
    case 'starter':
    case 'pro':
    case 'elite':
    case 'lifetime':
      return plan as 'starter' | 'pro' | 'elite' | 'lifetime';
    default:
      return 'starter';
  }
}

export default async function CheckoutPage(props: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();

  if (!session?.user || !(session.user as any).id) {
    redirect('/signin?reason=auth_required&next=/checkout');
  }

  const planParam = Array.isArray(props.searchParams?.plan)
    ? props.searchParams?.plan[0]
    : props.searchParams?.plan;
  const methodParam = Array.isArray(props.searchParams?.method)
    ? props.searchParams?.method[0]
    : props.searchParams?.method;

  const plan = toPlanCode(planParam);
  const method = (methodParam ?? 'card').toLowerCase();

  const userId = (session.user as any).id as string;

  const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.APP_URL?.replace(/\/$/, '') ||
    'http://localhost:3000';

  if (method === 'crypto') {
    redirect(`/pricing?method=crypto&plan=${plan}`);
  }

  const cs = await createCheckoutSession({
    userId,
    plan,
    successUrl: `${APP_URL}/account?checkout=success`,
    cancelUrl: `${APP_URL}/pricing?checkout=cancelled`,
  });

  if (!cs?.url) {
    redirect('/pricing?error=checkout_unavailable');
  }

  redirect(cs.url);
}
