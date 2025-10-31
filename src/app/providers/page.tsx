
import Link from 'next/link';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type ProviderRow = {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  trust_score: number;
  created_at: string;
  avg_win_7d: number | null;
  p95_latency_ms_7d: number | null;
  signals_7d: number | null;
};

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

function parseSort(input?: string) {
  const allowed = new Set(['trust', 'win', 'latency', 'signals', 'newest']);
  return allowed.has((input || '').toLowerCase()) ? (input as string) : 'trust';
}
function parseOrder(input?: string) { return (input || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC'; }

export default async function ProvidersDirectory({ searchParams }: { searchParams?: Record<string, string | string[] | undefined>; }) {
  await ensureProviderTables();
  const q = (Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q || '').toString().trim();
  const sort = parseSort(Array.isArray(searchParams?.sort) ? searchParams?.sort[0] : (searchParams?.sort as string | undefined));
  const order = parseOrder(Array.isArray(searchParams?.order) ? searchParams?.order[0] : (searchParams?.order as string | undefined));

  const rows = await db.execute(sql`
    WITH last7 AS (
      SELECT
        p.id, p.name, p.description, p.website, p.trust_score, p.created_at,
        AVG(s.win_rate) AS avg_win_7d,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY s.p95_latency_ms) AS p95_latency_ms_7d,
        SUM(s.signals_sent) AS signals_7d
      FROM providers p
      LEFT JOIN provider_stats s ON s.provider_id = p.id AND s.day >= (CURRENT_DATE - INTERVAL '6 days')
      ${q ? sql`WHERE p.name ILIKE ${'%' + q + '%'} OR p.description ILIKE ${'%' + q + '%'} ` : sql``}
      GROUP BY p.id
    )
    SELECT * FROM last7
    ORDER BY ${
      sort === 'trust' ? sql`trust_score ${sql.raw(order)}` :
      sort === 'win' ? sql`avg_win_7d ${sql.raw(order)} NULLS LAST` :
      sort === 'latency' ? sql`p95_latency_ms_7d ${sql.raw(order)} NULLS LAST` :
      sort === 'signals' ? sql`signals_7d ${sql.raw(order)} NULLS LAST` :
      sql`created_at ${sql.raw(order)}`
    }
    LIMIT 100;
  `);

  const providers = (rows.rows as any[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    description: r.description ? String(r.description) : null,
    website: r.website ? String(r.website) : null,
    trust_score: Number(r.trust_score),
    created_at: new Date(r.created_at).toISOString(),
    avg_win_7d: r.avg_win_7d !== null ? Number(r.avg_win_7d) : null,
    p95_latency_ms_7d: r.p95_latency_ms_7d !== null ? Number(r.p95_latency_ms_7d) : null,
    signals_7d: r.signals_7d !== null ? Number(r.signals_7d) : null,
  })) as ProviderRow[];

  return (
    <main className="max-w-6xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-2">Signal Providers</h1>
      <p className="text-sm text-neutral-700 mb-4">Directory of providers with 7-day performance snapshots. Sort and filter to compare at a glance.</p>

      <form method="GET" className="mb-4 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Search providers…" className="w-64 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black" />
        <select name="sort" defaultValue={sort} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          <option value="trust">Sort: Trust</option>
          <option value="win">Sort: Win%</option>
          <option value="latency">Sort: p95 Latency</option>
          <option value="signals">Sort: Signals (7d)</option>
          <option value="newest">Sort: Newest</option>
        </select>
        <select name="order" defaultValue={order.toLowerCase()} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <button className="rounded-lg bg-black text-white text-sm font-medium px-4 py-2">Apply</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr className="text-left">
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Trust</th>
              <th className="px-4 py-3">Win% (7d avg)</th>
              <th className="px-4 py-3">p95 Latency (7d)</th>
              <th className="px-4 py-3">Signals (7d)</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-600">No providers found.</td></tr>
            ) : (
              providers.map((p) => (
                <tr key={p.id} className="border-t border-neutral-100">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-neutral-600 line-clamp-2">{p.description}</div>
                  </td>
                  <td className="px-4 py-3">{p.trust_score}</td>
                  <td className="px-4 py-3">{p.avg_win_7d !== null ? `${(p.avg_win_7d * 100).toFixed(1)}%` : '—'}</td>
                  <td className="px-4 py-3">{p.p95_latency_ms_7d !== null ? `${p.p95_latency_ms_7d} ms` : '—'}</td>
                  <td className="px-4 py-3">{p.signals_7d ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link className="inline-flex items-center rounded-lg border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50" href={`/providers/${p.id}`}>View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
