
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payments, subscriptions } from '@/lib/db/schema';
import { and, gte, eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import PDFDocument from 'pdfkit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function assertCron(req: Request) {
  const hv = req.headers.get('x-vercel-cron'); if (hv === '1') return;
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  if (secret && process.env.CRON_SECRET && secret === process.env.CRON_SECRET) return;
  throw new Error('Unauthorized cron');
}

function getISOWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week: weekNo };
}

async function ensureArchiveTable() {
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
  try { assertCron(req); } catch { return new NextResponse('Unauthorized', { status: 401 }); }
  await ensureArchiveTable();

  const now = new Date();
  const { year, week } = getISOWeek(now);

  const ACTIVE = ['active', 'trialing'] as const;

  const activeSubs = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(inArray(subscriptions.status, ACTIVE as unknown as string[]));
  const revenueCents = await db.select({ sum: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)` }).from(payments).where(gte(payments.processedAt, new Date(now.getTime() - 7*24*60*60*1000)));

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks: Uint8Array[] = [];
  doc.on('data', (c) => chunks.push(c));

  doc.fontSize(18).text('Daily Macro Edge — Weekly Transparency Report', { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#555').text(`Week ${week}, ${year} (UTC) — Generated: ${new Date().toUTCString()}`);
  doc.moveDown(1);

  doc.fillColor('#000').fontSize(13).text('Summary', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Active subscriptions: ${activeSubs[0]?.count ?? 0}`);
  doc.text(`Revenue last 7 days: $${(((revenueCents[0]?.sum ?? 0) as number) / 100).toFixed(2)} USD`);
  doc.moveDown(1);

  doc.fontSize(13).text('Notes', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.list([
    'Figures exclude refunds and adjustments.',
    'All amounts in USD.',
    'Methodology may evolve; changes are documented here.'
  ]);

  doc.end();
  await new Promise<void>((resolve, reject) => { doc.on('end', () => resolve()); doc.on('error', (e) => reject(e)); });
  const buffer = Buffer.concat(chunks);
  const b64 = buffer.toString('base64');
  const id = crypto.randomUUID();

  await db.execute(sql`
    INSERT INTO transparency_reports (id, year, week, pdf_base64)
    VALUES (${id}, ${year}, ${week}, ${b64})
    ON CONFLICT (year, week) DO UPDATE SET pdf_base64 = EXCLUDED.pdf_base64, created_at = NOW();
  `);

  return NextResponse.json({ ok: true, id, year, week, bytes: buffer.byteLength });
}
