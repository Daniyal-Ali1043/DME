
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const PH_HOST = (process.env.POSTHOG_HOST || 'https://app.posthog.com').replace(/\/$/, '');

function targetUrl(req: NextRequest, suffix: string[]) {
  const path = suffix.length ? '/' + suffix.join('/') : '';
  const qs = req.nextUrl.search || '';
  return `${PH_HOST}${path}${qs}`;
}
function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
  };
}
export async function OPTIONS(req: NextRequest) { return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) }); }
export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const url = targetUrl(req, params.path || []);
  const upstream = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  const text = await upstream.text();
  return new NextResponse(text, { status: upstream.status, headers: { ...corsHeaders(req.headers.get('origin')), 'Content-Type': upstream.headers.get('content-type') || 'application/json' } });
}
export async function POST(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const url = targetUrl(req, params.path || []);
  const body = await req.text();
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': req.headers.get('content-type') || 'application/json', Authorization: req.headers.get('authorization') || '' },
    body,
  });
  const text = await upstream.text();
  return new NextResponse(text, { status: upstream.status, headers: { ...corsHeaders(req.headers.get('origin')), 'Content-Type': upstream.headers.get('content-type') || 'application/json' } });
}
