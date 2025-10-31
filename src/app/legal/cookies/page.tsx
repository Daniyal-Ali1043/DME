
export const dynamic = 'force-static';

export default function CookiesPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-3">Cookies & Consent</h1>
      <p className="text-sm text-neutral-700 mb-6">
        We use essential cookies to operate this site and optional analytics cookies to understand usage and improve the product. We do not use marketing or tracking pixels across third-party sites.
      </p>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Essential Cookies</h2>
        <p className="text-sm text-neutral-700">
          Required for core functionality like authentication and session security. These cannot be disabled.
        </p>
        <ul className="list-disc ml-5 text-sm text-neutral-700 mt-2">
          <li><code>dme_session</code> — session cookie for authentication.</li>
          <li><code>__Secure-next-auth.session-token</code> (internal) — Auth.js session management.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Analytics Cookies</h2>
        <p className="text-sm text-neutral-700">
          Optional. Used to collect anonymized usage events. We respect your choice and only initialize analytics if you opt in.
        </p>
        <ul className="list-disc ml-5 text-sm text-neutral-700 mt-2">
          <li><code>consent_analytics</code> — stores your consent choice (<em>true</em>/<em>false</em>).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Change Your Choice</h2>
        <p className="text-sm text-neutral-700">
          To change your choice, clear the <code>consent_analytics</code> cookie in your browser or use the consent banner when it reappears. You may also manage site data directly in your browser’s settings.
        </p>
      </section>
    </main>
  );
}
