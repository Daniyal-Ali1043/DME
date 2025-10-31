
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { year: string; week: string } }) {
  const year = Number(params.year);
  const week = Number(params.week);
  if (!Number.isFinite(year) || !Number.isFinite(week)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

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

  const row = await db.execute(sql`SELECT pdf_base64 FROM transparency_reports WHERE year = ${year} AND week = ${week} LIMIT 1;`);
  const r = (row.rows as any[])[0];
  if (!r?.pdf_base64) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const buffer = Buffer.from(String(r.pdf_base64), 'base64');
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="transparency-${year}-w${week}.pdf"`,
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}
