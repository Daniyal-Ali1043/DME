
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions, users } from '@/lib/db/schema';
import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { sendPreRenewalNotice } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function assertCron(req: Request) {
  const hv = req.headers.get('x-vercel-cron');
  if (hv === '1') return;
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  if (secret && process.env.CRON_SECRET && secret === process.env.CRON_SECRET) return;
  throw new Error('Unauthorized cron');
}

export async function GET(req: Request) {
  try { assertCron(req); } catch { return new NextResponse('Unauthorized', { status: 401 }); }

  const now = new Date();
  const in3 = new Date(now); in3.setDate(in3.getDate() + 3);
  const in4 = new Date(now); in4.setDate(in4.getDate() + 4);
  const activeStatuses = ['active', 'trialing', 'past_due'] as const;

  const rows = await db.query.subscriptions.findMany({
    where: and(inArray(subscriptions.status, activeStatuses as unknown as string[]), gte(subscriptions.currentPeriodEnd, in3), lte(subscriptions.currentPeriodEnd, in4), eq(subscriptions.provider, 'stripe')),
  });

  let sent = 0;
  for (const sub of rows) {
    const user = await db.query.users.findFirst({ where: eq(users.id, sub.userId), columns: { email: true, name: true } });
    if (!user?.email || !sub.currentPeriodEnd) continue;
    await sendPreRenewalNotice(user.email, { name: user.name ?? undefined, plan: sub.plan, renewsAt: sub.currentPeriodEnd });
    sent++;
  }
  return NextResponse.json({ ok: true, sent });
}
