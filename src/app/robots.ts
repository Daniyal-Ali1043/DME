
import type { MetadataRoute } from 'next';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  process.env.APP_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/blocked-region', '/api/', '/ingest/', '/api/events']
      }
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL
  };
}
