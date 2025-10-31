
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type Provider = { id: string; name: string; description: string | null; website: string | null; trust_score: number; created_at: string; };
type Stat = { day: string; win_rate: number; p95_latency_ms: number; signals_sent: number };

async function ensureProviderTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      website TEXT,
      trust_score INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS provider_stats (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      day DATE NOT NULL,
      win_rate NUMERIC NOT NULL,
      p95_latency_ms INT NOT NULL,
      signals_sent INT NOT NULL DEFAULT 0,
      UNIQUE (provider_id, day)
    );
  `);
}

async function getProvider(slug: string) {
  await ensureProviderTables();
  const res = await db.execute(sql`SELECT id, name, description, website, trust_score, created_at FROM providers WHERE id = ${slug} LIMIT 1;`);
  const r = (res.rows as any[])[0]; if (!r) return null;
  return { id: String(r.id), name: String(r.name), description: r.description ? String(r.description) : null, website: r.website ? String(r.website) : null, trust_score: Number(r.trust_score), created_at: new Date(r.created_at).toISOString() };
}

async function getLast7(slug: string) {
  const res = await db.execute(sql`
    SELECT day, win_rate, p95_latency_ms, signals_sent FROM provider_stats
    WHERE provider_id = ${slug} AND day >= (CURRENT_DATE - INTERVAL '6 days')
    ORDER BY day ASC;
  `);
  return (res.rows as any[]).map((r) => ({ day: new Date(r.day).toISOString().slice(0, 10), win_rate: Number(r.win_rate), p95_latency_ms: Number(r.p95_latency_ms), signals_sent: Number(r.signals_sent) }));
}

function Sparkline({ points, label, unit }: { points: number[]; label: string; unit?: string }) {
  const w = 160, h = 40, pad = 2;
  const min = Math.min(...points), max = Math.max(...points), span = Math.max(1e-6, max - min);
  const X = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
  const Y = (v: number) => h - pad - ((v - min) * (h - pad * 2)) / span;
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${X(i).toFixed(2)} ${Y(v).toFixed(2)}`).join(' ');
  const last = points[points.length - 1];
  const lastText = unit === '%' ? `${last.toFixed(1)}%` : unit === 'ms' ? `${Math.round(last)} ms` : `${last.toFixed(2)}`;
  return (
    <div className="flex items-center gap-2">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      <div className="text-xs text-neutral-700"><div className="font-medium">{label}</div><div className="text-neutral-500">{lastText}</div></div>
    </div>
  );
}

export default async function ProviderDetail({ params }: { params: { slug: string } }) {
  const provider = await getProvider(params.slug);
  if (!provider) notFound();

  const stats = await getLast7(provider.id);
  const winSeries = stats.map((s) => s.win_rate * 100);
  const latSeries = stats.map((s) => s.p95_latency_ms);
  const sigs = stats.reduce((a, s) => a + s.signals_sent, 0);
  const avgWin = winSeries.length ? winSeries.reduce((a, b) => a + b, 0) / winSeries.length : null;
  const p95Latest = latSeries.length ? latSeries[latSeries.length - 1] : null;

  return (
    <main className="max-w-4xl mx-auto py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">{provider.name}</h1>
        <p className="text-sm text-neutral-700">{provider.description || 'No description provided.'}</p>
        <div className="mt-2 flex gap-3 text-sm">
          <span className="inline-flex items-center rounded-md border border-neutral-300 px-2 py-0.5">Trust: <span className="ml-1 font-medium">{provider.trust_score}</span></span>
          {provider.website && (<a className="underline" href={provider.website} target="_blank" rel="noreferrer">Website</a>)}
        </div>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">7-Day Performance</h2>
        {stats.length === 0 ? (<p className="text-sm text-neutral-600">No recent stats available.</p>) : (
          <div className="flex flex-wrap gap-6">
            <Sparkline points={winSeries} label="Win rate (7d)" unit="%" />
            <Sparkline points={latSeries} label="p95 latency (7d)" unit="ms" />
          </div>
        )}
        <div className="mt-4 text-sm text-neutral-700">
          <div>Total signals last 7 days: <span className="font-medium">{sigs}</span></div>
          <div>Avg win rate: <span className="font-medium">{avgWin !== null ? `${avgWin.toFixed(1)}%` : '—'}</span>{' · '}Latest p95 latency:{' '}<span className="font-medium">{p95Latest !== null ? `${Math.round(p95Latest)} ms` : '—'}</span></div>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-base font-semibold mb-2">Audit Notes</h3>
        <p className="text-sm text-neutral-700">
          Provider stats are aggregated daily. Win% is computed per delivered signal with de-biased labeling.
          Latency is measured from provider emit time to user receipt at the edge (p95). Delivery SLAs and audits will appear here as they are completed.
        </p>
      </section>
    </main>
  );
}
