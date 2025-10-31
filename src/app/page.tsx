
import Link from 'next/link';

export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <main className="py-10">
      <h1 className="text-3xl font-semibold mb-2">Daily Macro Edge</h1>
      <p className="text-neutral-700 mb-6">Compliance-first trading intelligence with verified transparency.</p>
      <div className="flex gap-3">
        <Link href="/pricing" className="rounded-lg bg-black text-white text-sm px-4 py-2">View pricing</Link>
        <Link href="/transparency" className="rounded-lg border border-neutral-300 text-sm px-4 py-2">Transparency</Link>
      </div>
    </main>
  );
}
