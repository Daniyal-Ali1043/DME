
'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function AccountPage() {
  const { data } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Unable to open billing portal');
      const j = await res.json(); window.location.href = j.url;
    } catch (e: any) { setError(e?.message || 'Unable to open billing portal'); }
    finally { setBusy(false); }
  }

  const userEmail = data?.user?.email ?? '';
  const userName = data?.user?.name ?? '';

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Your account</h1>
      <p className="text-sm text-neutral-600 mb-6">Signed in as <span className="font-medium">{userName || userEmail}</span></p>

      <div className="rounded-2xl border border-neutral-200 p-6 bg-white shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-2">Subscription</h2>
        <p className="text-sm text-neutral-600 mb-4">Manage your plan, update payment method, or cancel anytime in the billing portal.</p>
        <div className="flex gap-3">
          <button onClick={openPortal} disabled={busy} className="rounded-lg bg-black text-white text-sm font-medium px-4 py-2 disabled:opacity-50">
            {busy ? 'Opening…' : 'Manage Billing'}
          </button>
          {error && <span className="text-sm text-red-600 self-center">{error}</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-6 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Legal & Consent</h2>
        <p className="text-sm text-neutral-600">
          Review our <a className="underline" href="/legal/terms" target="_blank" rel="noreferrer">Terms</a> and <a className="underline" href="/legal/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>. Acceptance logs are stored for compliance.
        </p>
      </div>
    </div>
  );
}
