
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { acceptanceLogs } from '@/lib/db/schema';
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/legal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const ua = req.headers.get('user-agent') || '';

  await db.insert(acceptanceLogs).values({
    id: crypto.randomUUID(),
    userId,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    ip, userAgent: ua
  });

  return NextResponse.json({ ok: true, terms: TERMS_VERSION, privacy: PRIVACY_VERSION });
}
