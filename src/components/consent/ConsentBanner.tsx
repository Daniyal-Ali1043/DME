
'use client';
import { useEffect, useState } from 'react';

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}
function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const d = new Date(); d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + d.toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax; ${location.protocol === 'https:' ? 'Secure;' : ''}`;
}

export default function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState<boolean>(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const a = getCookie('consent_analytics');
    if (a === 'true' || a === 'false') { setOpen(false); setInitialized(true); return; }
    setOpen(true); setInitialized(true);
  }, []);

  if (!initialized || !open) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto z-50 max-w-2xl">
      <div className="rounded-2xl border border-neutral-200 shadow-lg bg-white p-4">
        <h3 className="text-sm font-semibold mb-1">Your privacy</h3>
        <p className="text-xs text-neutral-700 mb-3">
          We use essential cookies to make this site work. With your consent, we’ll use analytics cookies to understand usage and improve the product. You can change your choice anytime on the Cookies page.
        </p>

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
            Enable analytics
          </label>

          <div className="flex gap-2">
            <button onClick={() => { setCookie('consent_analytics', 'false'); setOpen(false); location.reload(); }} className="rounded-lg border border-neutral-300 bg-white text-xs px-3 py-1.5">
              Reject all
            </button>
            <button onClick={() => { setCookie('consent_analytics', analytics ? 'true' : 'false'); setOpen(false); location.reload(); }} className="rounded-lg bg-black text-white text-xs px-3 py-1.5">
              Save choices
            </button>
          </div>
        </div>

        <div className="mt-2 text-[11px]">
          <a href="/legal/cookies" className="underline text-neutral-600">Cookie policy</a>
        </div>
      </div>
    </div>
  );
}
