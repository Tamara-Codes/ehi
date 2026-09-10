import { db } from "@/lib/db/client";
import { pushSubscriptions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function saveSubscription(
  userId: number,
  endpoint: string,
  p256dh: string,
  auth: string,
) {
  // userId is included in the conflict update, not just p256dh/auth: if the
  // same browser subscription endpoint gets submitted again under a
  // different logged-in user (a shared device, or a re-invited account),
  // the row should follow the current owner — otherwise it silently stays
  // bound to whoever first created it, and getSubscriptionsForActiveWorkers
  // (which joins on that userId) would exclude it once that original owner
  // is deactivated, even though the current user believes push is enabled.
  const [row] = await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh, auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh, auth },
    })
    .returning();
  return row;
}

export async function deleteSubscriptionByEndpoint(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

// Every push subscription belonging to a currently-active worker — this is
// who actually gets the daily reminder.
export async function getSubscriptionsForActiveWorkers() {
  return db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(users, eq(pushSubscriptions.userId, users.id))
    .where(eq(users.status, "active"));
}
