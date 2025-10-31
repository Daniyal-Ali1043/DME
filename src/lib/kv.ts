
import { Redis } from '@upstash/redis';
let _client: Redis | null = null;
export function kv() {
  if (_client) return _client;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('UPSTASH_REDIS_* env vars are required');
  }
  _client = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
  return _client;
}
