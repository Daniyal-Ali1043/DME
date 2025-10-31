import { NextResponse, type NextRequest } from 'next/server';

// ✅ Edge-safe (no next-auth, no node-only deps)
interface ExtendedGeo {
  city?: string;
  country?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
  continent?: string;
}

const BLOCKED_COUNTRIES = (process.env.BLOCKED_COUNTRIES || '')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

function isBlockedByRegion(req: NextRequest) {
  const geo = req.geo as ExtendedGeo | undefined;
  const country =
    geo?.country?.toUpperCase() ||
    req.headers.get('x-vercel-ip-country')?.toUpperCase() ||
    null;
  const continent =
    geo?.continent?.toUpperCase() ||
    req.headers.get('x-vercel-ip-continent')?.toUpperCase() ||
    null;
  if (!country && !continent) return false;
  if (continent && BLOCKED_COUNTRIES.includes(continent)) return true;
  if (country && BLOCKED_COUNTRIES.includes(country)) return true;
  return false;
}

function isAssetPath(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json|map)$/i)
  );
}

// ✅ Edge-safe nonce
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

function buildCSP(nonce: string) {
  const posthog = '*.posthog.com';
  const stripe =
    '*.stripe.com *.stripe.network api.stripe.com m.stripe.network r.stripe.com';
  return [
    "default-src 'self';",
    `script-src 'self' 'strict-dynamic' 'nonce-${nonce}';`,
    "style-src 'self' 'unsafe-inline';",
    "img-src 'self' data: blob:;",
    "media-src 'self';",
    `connect-src 'self' ${posthog} ${stripe};`,
    `frame-src 'self' ${stripe};`,
    "object-src 'none';",
    "base-uri 'self';",
    "frame-ancestors 'none';",
    'upgrade-insecure-requests;',
  ].join(' ');
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (BLOCKED_COUNTRIES.length > 0 && isBlockedByRegion(req)) {
    const url = req.nextUrl.clone();
    url.pathname = '/blocked-region';
    url.searchParams.set('from', pathname);
    return NextResponse.rewrite(url, {
      headers: { 'X-Robots-Tag': 'noindex, nofollow, noarchive' },
    });
  }

  const res = NextResponse.next();

  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), serial=(), magnetometer=(), gyroscope=(), fullscreen=(self)'
  );
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  if (!isAssetPath(pathname)) {
    const nonce = generateNonce();
    res.headers.set('Content-Security-Policy', buildCSP(nonce));
    res.headers.set('x-nonce', nonce);
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
