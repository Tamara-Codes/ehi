import { z } from "zod";
import {
  saveSubscription,
  deleteSubscriptionByEndpoint,
  getSubscriptionsForActiveWorkers,
} from "@/lib/repositories/push.repo";
import {
  listSchedules,
  markScheduleNotified,
} from "@/lib/repositories/notificationSchedules.repo";
import { webpush } from "@/lib/webpush";
import { businessDateString, businessDayOfWeek, businessTimeString } from "@/lib/businessDate";
import { requireUser } from "@/lib/auth-guards";

// Push endpoints only ever come from a real browser push service — this
// allowlist is a defense-in-depth measure against SSRF: without it, an
// authenticated user could submit an arbitrary URL as their "endpoint",
// and our server would later make an outbound HTTP request to it (with a
// signed payload) every time a reminder fires, from
// sendDueReminders's webpush.sendNotification call.
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
  // requireUser (not a bare auth() truthiness check) also rejects a
  // deactivated worker whose session cookie is technically still valid —
  // see auth-guards.ts for why that check has to live server-side, not
  // just at login time.
  const session = await requireUser();

  const sub = subscriptionSchema.parse(rawSubscription);
  return saveSubscription(session.user.id, sub.endpoint, sub.keys.p256dh, sub.keys.auth);
}

// The timing-relevant fields of one notification_schedules row — deliberately
// narrower than the full DB row (no id/message/createdAt) so
// computeReminderDecision stays a pure function of "is it time yet", testable
// without a real schedule object.
export type ScheduleTiming = {
  lastNotifiedDate: string | null;
  notifyDays: number[];
  notificationTime: string;
};

export type ReminderDecision =
  | { due: false; reason: "already-sent-today" | "not-a-notify-day" | "not-yet-time" }
  | { due: true };

// Pure decision logic, deliberately separated from the DB/network calls in
// sendDueReminders below — this is what makes it unit-testable without a
// live database or an actual push send.
//
// Everything here derives from businessDate helpers (Europe/Zagreb local
// time), not the server process's own timezone or raw UTC — the admin's
// "16:00" and notifyDays selections mean Zagreb local time, and the server
// (Vercel, defaulting to UTC) has no reason to agree with that on its own.
export function computeReminderDecision(
  schedule: ScheduleTiming,
  now: Date,
): ReminderDecision {
  const today = businessDateString(now);
  if (schedule.lastNotifiedDate === today) {
    return { due: false, reason: "already-sent-today" };
  }

  if (!schedule.notifyDays.includes(businessDayOfWeek(now))) {
    return { due: false, reason: "not-a-notify-day" };
  }

  const currentTime = businessTimeString(now);
  const targetTime = schedule.notificationTime.slice(0, 5);

  if (currentTime < targetTime) {
    return { due: false, reason: "not-yet-time" };
  }

  return { due: true };
}

async function sendToAllActiveWorkers(message: string) {
  const subscriptions = await getSubscriptionsForActiveWorkers();
  const payload = JSON.stringify({ title: "Dnevnik radova", body: message });

  let succeeded = 0;
  let unexpectedFailures = 0;
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
        } else {
          // Anything else (misconfigured VAPID keys, network failure, the
          // push service being down) is a real, actionable failure — log it
          // rather than swallowing it silently, so a fully-broken push
          // pipeline actually surfaces somewhere (Vercel's function logs).
          unexpectedFailures++;
          console.error("Push notification failed for subscription", sub.id, err);
        }
      }
    }),
  );

  return { succeeded, total: subscriptions.length, unexpectedFailures };
}

// Called by the cron-triggered route, not by a user — see
// app/api/cron/notify/route.ts. Checks every admin-configured reminder
// schedule independently (there can be any number, e.g. a morning one and
// an evening one, each with its own message) and sends whichever ones are
// due on this run.
export async function sendDueReminders() {
  const schedules = await listSchedules();
  const now = new Date();
  const today = businessDateString(now);

  const results = [];

  for (const schedule of schedules) {
    const decision = computeReminderDecision(schedule, now);
    if (!decision.due) {
      results.push({ scheduleId: schedule.id, sent: false, reason: decision.reason } as const);
      continue;
    }

    const { succeeded, total, unexpectedFailures } = await sendToAllActiveWorkers(
      schedule.message,
    );

    // Only mark today as "done" for this schedule if we either had nothing
    // to send (nothing to retry) or actually got at least one through. If
    // there were subscriptions and every single one failed for a
    // non-404/410 reason, that's very possibly a systemic outage (e.g. bad
    // VAPID keys) rather than a one-off — leave lastNotifiedDate unset so
    // the next cron run (a few minutes later) retries instead of silently
    // giving up on the whole day.
    const markedDone = total === 0 || succeeded > 0;
    if (markedDone) {
      await markScheduleNotified(schedule.id, today);
    }

    results.push({
      scheduleId: schedule.id,
      sent: true,
      succeeded,
      total,
      unexpectedFailures,
      markedDone,
    } as const);
  }

  return results;
}
