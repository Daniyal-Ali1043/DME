
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCustomerPortalSession } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const portal = await createCustomerPortalSession(userId);
  if (!portal?.url) {
    return NextResponse.json({ error: 'No active Stripe subscription found for billing portal.' }, { status: 400 });
  }
  return NextResponse.json({ url: portal.url }, { status: 200 });
}
