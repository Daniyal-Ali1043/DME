
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
function redis() {
  if (_redis) return _redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for rate limiting.');
  }
  _redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
  return _redis;
}

export function buildLimiter(options: { prefix: string; requests: number; window: number }) {
  return new Ratelimit({
    redis: redis(),
    prefix: options.prefix,
    limiter: Ratelimit.slidingWindow(options.requests, `${options.window} s`),
    analytics: true,
  });
}

export const ipLimiterWebhook = buildLimiter({
  prefix: 'rl:webhook',
  requests: Number(process.env.WEBHOOK_RATE_LIMIT_REQUESTS || 60),
  window: Number(process.env.WEBHOOK_RATE_LIMIT_WINDOW || 60),
});

export const ipLimiterApi = buildLimiter({
  prefix: 'rl:api',
  requests: Number(process.env.API_RATE_LIMIT_REQUESTS || 120),
  window: Number(process.env.API_RATE_LIMIT_WINDOW || 60),
});

export function getClientIPFromHeaders(headers: Headers) {
  const xf = headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim();
  const real = headers.get('x-real-ip');
  if (real) return real.trim();
  const cf = headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  return '0.0.0.0';
}

export async function assertWebhookRateLimit(headers: Headers) {
  const ip = getClientIPFromHeaders(headers);
  const res = await ipLimiterWebhook.limit(ip);
  if (!res.success) {
    const retryAfter = Math.ceil((res.reset - Date.now()) / 1000);
    const e: any = new Error('Too Many Requests');
    e.status = 429;
    e.retryAfter = retryAfter;
    throw e;
  }
}
