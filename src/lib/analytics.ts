import { PostHog } from 'posthog-node';

const POSTHOG_KEY =
  process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://app.posthog.com';

export type AnalyticsEvent =
  | 'user_signed_up'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'page_viewed'
  | 'legal_accepted';

let _ph: PostHog | null = null;

function getClient(): PostHog | null {
  if (!POSTHOG_KEY) return null;
  if (_ph) return _ph;

  // ✅ Removed invalid `enable` option
  _ph = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    flushAt: 20,
    flushInterval: 5000,
  });

  return _ph;
}

export async function captureServerEvent(opts: {
  distinctId: string;
  event: AnalyticsEvent;
  properties?: Record<string, unknown>;
}) {
  const client = getClient();
  if (!client) return;

  client.capture({
    distinctId: opts.distinctId,
    event: opts.event,
    properties: opts.properties || {},
  });
}

export async function flushAnalytics() {
  const client = getClient();
  if (!client) return;

  // ✅ `flushAsync` doesn’t exist — correct call is `flush()`
  await client.flush();
}
