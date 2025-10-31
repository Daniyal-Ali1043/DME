
import type { MetadataRoute } from 'next';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  process.env.APP_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: string[] = ['/', '/pricing', '/account', '/blocked-region', '/legal/terms', '/legal/privacy', '/legal/cookies', '/providers', '/transparency'];
  const now = new Date().toISOString();
  return routes.map((path) => ({
    url: `${APP_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/pricing' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}
