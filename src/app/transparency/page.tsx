
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS transparency_reports (
      id TEXT PRIMARY KEY,
      year INT NOT NULL,
      week INT NOT NULL,
      pdf_base64 TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (year, week)
    );
  `);
}

type ReportRow = { id: string; year: number; week: number; created_at: string; };

async function getReports(): Promise<ReportRow[]> {
  await ensureTables();
  const res = await db.execute(sql`
    SELECT id, year, week, created_at FROM transparency_reports ORDER BY year DESC, week DESC LIMIT 52;
  `);
  return (res.rows as any[]).map((r) => ({ id: String(r.id), year: Number(r.year), week: Number(r.week), created_at: new Date(r.created_at).toISOString() }));
}

function ExternalBadges() {
  const myfxbook = process.env.MYFXBOOK_URL;
  const fxblue = process.env.FXBLUE_URL;
  const links = [
    myfxbook ? { href: myfxbook, label: 'Myfxbook Verified' } : null,
    fxblue ? { href: fxblue, label: 'FXBlue Verified' } : null,
  ].filter(Boolean) as { href: string; label: string }[];
  if (links.length === 0) return null;
  return (
    <div className="mt-4 flex gap-3 flex-wrap">
      {links.map((l) => (
        <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-800 text-xs font-medium hover:bg-emerald-100">
          ✓ {l.label}
        </a>
      ))}
    </div>
  );
}

export default async function TransparencyPage() {
  const reports = await getReports();
  return (
    <main className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-2">Transparency Hub</h1>
      <p className="text-sm text-neutral-700">Weekly snapshots of performance and operations. These PDFs are generated automatically and archived for auditability.</p>
      <ExternalBadges />

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Weekly Reports</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-neutral-600">No transparency reports are available yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
            {reports.map((r) => (
              <li key={`${r.year}-${r.week}`} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Week {r.week}, {r.year}</p>
                  <p className="text-xs text-neutral-600">Generated {new Date(r.created_at).toUTCString()}</p>
                </div>
                <a href={`/api/public/v1/transparency/${r.year}/${r.week}`} className="rounded-lg bg-black text-white text-xs font-medium px-3 py-1.5 hover:opacity-95">Download PDF</a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Methodology</h2>
        <p className="text-sm text-neutral-700">
          Figures are computed from internal ledgers and brokerage-verified stats where available. Amounts are in USD.
          We publish methodology updates and calculation changes directly in the weekly PDFs for full traceability.
        </p>
      </section>
    </main>
  );
}
