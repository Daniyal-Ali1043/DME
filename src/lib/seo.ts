
import type { Metadata } from 'next';

const APP_NAME = 'Daily Macro Edge';
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  process.env.APP_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export function absoluteUrl(path: string = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${APP_URL}${p}`;
}

export function pageMetadata(input: { title: string; description: string; path?: string; image?: string; }): Metadata {
  const url = absoluteUrl(input.path || '/');
  const image = input.image || `${APP_URL}/og.png`;
  return {
    metadataBase: new URL(APP_URL),
    title: `${input.title} — ${APP_NAME}`,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website', url, siteName: APP_NAME,
      title: `${input.title} — ${APP_NAME}`, description: input.description,
      images: [{ url: image }],
    },
    twitter: { card: 'summary_large_image', title: `${input.title} — ${APP_NAME}`, description: input.description, images: [image] },
  };
}
