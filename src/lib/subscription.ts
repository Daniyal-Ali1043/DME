
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid';

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due'];

export async function getUserSubscription(userId: string) {
  const sub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      inArray(subscriptions.status, ACTIVE_STATUSES as unknown as string[]),
    ),
    orderBy: [desc(subscriptions.updatedAt)],
  });
  return sub || null;
}
