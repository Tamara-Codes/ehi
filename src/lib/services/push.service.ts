import { z } from "zod";
import { auth } from "@/auth";
import {
  saveSubscription,
  deleteSubscriptionByEndpoint,
  getSubscriptionsForActiveWorkers,
} from "@/lib/repositories/push.repo";
import { getSettings, markNotifiedToday } from "@/lib/repositories/settings.repo";
import { webpush } from "@/lib/webpush";

// Push endpoints only ever come from a real browser push service — this
// allowlist is a defense-in-depth measure against SSRF: without it, an
// authenticated user could submit an arbitrary URL as their "endpoint",
// and our server would later make an outbound HTTP request to it (with a
// signed payload) every time the daily reminder fires, from
// sendDailyReminderIfDue's webpush.sendNotification call.
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com", // Chrome, Edge, other Chromium browsers
  "updates.push.services.mozilla.com", // Firefox
  "web.push.apple.com", // Safari
  "notify.windows.com", // legacy Edge/WNS
];

// Exported for direct unit testing of the SSRF allowlist — see
// push.service.test.ts. subscribeCurrentUser itself needs a request-scoped
// session (via auth()) to test end-to-end, but the validation rule that
// actually matters for this defense doesn't depend on that at all.
export const subscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .refine((url) => {
      // Zod's chained checks don't short-circuit on an earlier failure —
      // .refine() still runs even after .url() has already rejected the
      // string, so `new URL(url)` needs its own guard rather than assuming
      // it only ever sees an already-valid URL.
      try {
        return ALLOWED_PUSH_HOSTS.includes(new URL(url).hostname);
      } catch {
        return false;
      }
    }, "Unrecognized push service endpoint"),
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

export type ReminderSettings = {
  lastNotifiedDate: string | null;
  notifyDays: number[];
  notificationTime: string;
};

export type ReminderDecision =
  | { due: false; reason: "already-sent-today" | "not-a-notify-day" | "not-yet-time" }
  | { due: true };

// Pure decision logic, deliberately separated from the DB/network calls in
// sendDailyReminderIfDue below — this is what makes it unit-testable
// without a live database or an actual push send.
export function computeReminderDecision(
  settings: ReminderSettings,
  now: Date,
): ReminderDecision {
  const today = now.toISOString().slice(0, 10);
  if (settings.lastNotifiedDate === today) {
    return { due: false, reason: "already-sent-today" };
  }

  if (!settings.notifyDays.includes(now.getDay())) {
    return { due: false, reason: "not-a-notify-day" };
  }

  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const targetTime = settings.notificationTime.slice(0, 5);

  if (currentTime < targetTime) {
    return { due: false, reason: "not-yet-time" };
  }

  return { due: true };
}

// Called by the cron-triggered route, not by a user — see
// app/api/cron/notify/route.ts. Sends the daily reminder to every active
// worker's registered device(s), but only once, on the first run whose
// clock time reaches the admin-configured notification time each day.
export async function sendDailyReminderIfDue() {
  const settings = await getSettings();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const decision = computeReminderDecision(settings, now);
  if (!decision.due) {
    return { sent: false, reason: decision.reason } as const;
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
