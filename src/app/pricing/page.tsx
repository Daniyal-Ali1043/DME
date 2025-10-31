
import { headers } from 'next/headers';
import Link from 'next/link';
import JsonLd from '@/components/seo/JsonLd';
import { pageMetadata, absoluteUrl } from '@/lib/seo';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

const plans = [
  { code: 'starter', name: 'Starter', price: 29, interval: 'month', features: ['Core signal feed', 'Email alerts', 'Basic support'] },
  { code: 'pro', name: 'Pro', price: 49, interval: 'month', features: ['Everything in Starter', 'Advanced alerts & filters', 'Priority support'] },
  { code: 'elite', name: 'Elite', price: 69, interval: 'month', features: ['Everything in Pro', 'Research notes', 'Strategy deep-dives'] },
  { code: 'lifetime', name: 'Lifetime', price: 599, interval: 'one-time', features: ['Lifetime access', 'All features included', 'Early access to new tools'] },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Pricing',
    description: 'Transparent USD-only pricing with simple plans. No VAT, no hidden fees. Start with Starter, Pro, Elite, or go Lifetime.',
    path: '/pricing',
  });
}

function productJsonLd() {
  const brand = 'Daily Macro Edge';
  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Daily Macro Edge Signals',
    brand: { '@type': 'Brand', name: brand },
    category: 'FinancialProduct',
    url: absoluteUrl('/pricing'),
    description: 'Trading signals and research with compliance-first approach and verified transparency.',
    offers: plans.map((p) => ({
      '@type': 'Offer',
      url: absoluteUrl(`/checkout?plan=${p.code}&method=card`),
      priceCurrency: 'USD',
      price: p.price.toFixed(2),
      availability: 'https://schema.org/InStock',
      category: p.interval === 'one-time' ? 'Lifetime' : 'Subscription',
      name: `${p.name} Plan`,
    })),
  };
  return product;
}

export default function PricingPage() {
  const hdrs = headers();
  const nonce = hdrs.get('x-nonce') || undefined;

  return (
    <main className="py-8">
      <section className="text-center mb-8">
        <h1 className="text-3xl font-semibold mb-2">Simple, USD-only pricing</h1>
        <p className="text-neutral-600">No VAT. Cancel anytime. Compliance-first signals with verified transparency.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div key={p.code} className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-1">{p.name}</h2>
            <p className="text-sm text-neutral-600 mb-4">
              {p.interval === 'one-time' ? (<><span className="text-3xl font-semibold">${p.price}</span><span className="ml-1 text-sm text-neutral-500">one-time</span></>) :
              (<><span className="text-3xl font-semibold">${p.price}</span><span className="ml-1 text-sm text-neutral-500">/mo</span></>)}
            </p>
            <ul className="text-sm text-neutral-700 space-y-2 mb-6">
              {p.features.map((f) => (<li key={f} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-900" /><span>{f}</span></li>))}
            </ul>
            <Link href={`/checkout?plan=${p.code}&method=card`} className="mt-auto inline-flex items-center justify-center rounded-lg bg-black text-white text-sm font-medium px-4 py-2 hover:opacity-95">
              {p.interval === 'one-time' ? 'Buy Lifetime' : 'Subscribe'}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-10 text-xs text-neutral-500">
        Prices in USD. Digital access; see <Link href="/legal/terms" className="underline">Terms</Link> and <Link href="/legal/privacy" className="underline">Privacy</Link>.
      </div>
      <JsonLd json={productJsonLd()} nonce={nonce} />
    </main>
  );
}
