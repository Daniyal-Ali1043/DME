
import './globals.css';
import { cookies, headers } from 'next/headers';
import type { Metadata } from 'next';
import ConsentBanner from '@/components/consent/ConsentBanner';
import PostHogInit from '@/components/analytics/PostHogInit';

const APP_NAME = 'Daily Macro Edge';
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  process.env.APP_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `${APP_NAME} — Trusted FinTech Signals`, template: `%s — ${APP_NAME}` },
  description: 'Daily Macro Edge delivers high-signal, compliance-first trading intelligence with verified transparency.',
  alternates: { canonical: APP_URL },
  openGraph: {
    type: 'website', url: APP_URL, siteName: APP_NAME,
    title: `${APP_NAME} — Trusted FinTech Signals`,
    description: 'Compliance-first trading intelligence with verified transparency and clear subscription plans.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — Trusted FinTech Signals`,
    description: 'Compliance-first trading intelligence with verified transparency and clear subscription plans.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const store = cookies();
  const consentAnalytics = (store.get('consent_analytics')?.value || '').toLowerCase() === 'true';
  const hdrs = headers();
  const nonce = hdrs.get('x-nonce') || undefined;

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <PostHogInit enabled={consentAnalytics} apiHost="/ingest" nonce={nonce} />
        <ConsentBanner />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </body>
    </html>
  );
}
