
export const dynamic = 'force-static';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  process.env.APP_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export default function ApiDocsPage() {
  return (
    <main className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-2">Public API</h1>
      <p className="text-sm text-neutral-700 mb-6">
        Lightweight, compliance-first endpoints. Rate-limited and signed. Contact us for higher quotas.
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">GET /api/public/v1/status</h2>
        <p className="text-sm text-neutral-700 mb-2">
          Returns system status, key service availability, and high-level metrics (no PII).
        </p>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm"><code>{APP_URL}/api/public/v1/status</code></div>
        <p className="mt-2 text-xs text-neutral-600">Caching: 30s; Rate limit applies.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">POST /api/events</h2>
        <p className="text-sm text-neutral-700 mb-2">Signed (HMAC-SHA256) analytics intake with idempotency. Use for server-to-server events.</p>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-xs space-y-2">
          <div><strong>Headers</strong></div>
          <pre className="overflow-x-auto whitespace-pre-wrap">
{`Content-Type: application/json
Idempotency-Key: <uuid>
x-dme-timestamp: <unix-epoch-seconds>
x-dme-signature: <hex HMAC of "<timestamp>.<raw-body>" using EVENTS_API_SECRET>`}
          </pre>

          <div><strong>Body</strong></div>
          <pre className="overflow-x-auto">
{`{
  "event": "subscription_started",
  "distinctId": "user_123",
  "properties": { "plan": "pro" }
}`}
          </pre>

          <div><strong>Allowed events</strong></div>
          <code>user_signed_up, subscription_started, subscription_cancelled, page_viewed, legal_accepted</code>
        </div>

        <p className="mt-2 text-xs text-neutral-600">
          Responses: <code>200</code> OK (with <code>idempotent</code> flag), <code>401</code> signature/timestamp issues, <code>422</code> validation errors.
        </p>
      </section>
    </main>
  );
}
