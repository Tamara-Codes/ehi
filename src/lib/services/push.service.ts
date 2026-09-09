import { z } from "zod";
import { auth } from "@/auth";
import {
  saveSubscription,
  deleteSubscriptionByEndpoint,
  getSubscriptionsForActiveWorkers,
} from "@/lib/repositories/push.repo";
import { getSettings, markNotifiedToday } from "@/lib/repositories/settings.repo";
import { webpush } from "@/lib/webpush";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function subscribeCurrentUser(rawSubscription: unknown) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const sub = subscriptionSchema.parse(rawSubscription);
  return saveSubscription(session.user.id, sub.endpoint, sub.keys.p256dh, sub.keys.auth);
}

// Called by the cron-triggered route, not by a user — see
// app/api/cron/notify/route.ts. Sends the daily reminder to every active
// worker's registered device(s), but only once, on the first run whose
// clock time reaches the admin-configured notification time each day.
export async function sendDailyReminderIfDue() {
  const settings = await getSettings();
  const today = new Date().toISOString().slice(0, 10);

  if (settings.lastNotifiedDate === today) {
    return { sent: false, reason: "already-sent-today" as const };
  }

  const now = new Date();

  if (!settings.notifyDays.includes(now.getDay())) {
    return { sent: false, reason: "not-a-notify-day" as const };
  }

  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const targetTime = settings.notificationTime.slice(0, 5);

  if (currentTime < targetTime) {
    return { sent: false, reason: "not-yet-time" as const };
  }

  const subscriptions = await getSubscriptionsForActiveWorkers();
  const payload = JSON.stringify({
    title: "Dnevnik radova",
    body: "Ne zaboravite upisati što ste danas radili.",
  });

  let succeeded = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        succeeded++;
      } catch (err: unknown) {
        // 404/410 mean the browser unsubscribed or the subscription expired
        // on the push service's end — clean up rather than retrying forever.
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscriptionByEndpoint(sub.endpoint);
        }
      }
    }),
  );

  await markNotifiedToday(today);

  return { sent: true, succeeded, total: subscriptions.length } as const;
}
