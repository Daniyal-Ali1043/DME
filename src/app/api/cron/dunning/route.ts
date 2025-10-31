
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, payments, users } from '@/lib/db/schema';
import { and, eq, gte } from 'drizzle-orm';
import { sendDunningEmail } from '@/lib/email';

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
  const dayAgo = new Date(now); dayAgo.setDate(dayAgo.getDate() - 1);
  let sent = 0;

  const failed = await db.query.payments.findMany({ where: and(eq(payments.status, 'failed'), gte(payments.processedAt, dayAgo)), columns: { userId: true, amountCents: true } });
  for (const p of failed) {
    const user = await db.query.users.findFirst({ where: eq(users.id, p.userId), columns: { email: true, name: true } });
    if (!user?.email) continue;
    await sendDunningEmail(user.email, { name: user.name ?? undefined, amountCents: p.amountCents ?? undefined, reason: 'failed_payment' });
    sent++;
  }

  const openInv = await db.query.invoices.findMany({ where: and(eq(invoices.status, 'open'), gte(invoices.issuedAt, dayAgo)), columns: { userId: true, amountCents: true } });
  for (const inv of openInv) {
    const user = await db.query.users.findFirst({ where: eq(users.id, inv.userId), columns: { email: true, name: true } });
    if (!user?.email) continue;
    await sendDunningEmail(user.email, { name: user.name ?? undefined, amountCents: inv.amountCents ?? undefined, reason: 'invoice_open' });
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
