import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isNotificationPollingWindow } from "@/lib/businessDate";
import { sendDueReminders } from "@/lib/services/push.service";

// Plain !== comparison is vulnerable in principle to a timing side-channel
// (it returns as soon as the first differing byte is found, so response
// time leaks how many leading characters matched) — timingSafeEqual takes
// the same time regardless of where the mismatch is. Real-world risk here
// is low (network jitter dwarfs the signal, and the worst case is just a
// duplicate notification send, not data exposure), but it's a one-line fix.
function isAuthorized(request: NextRequest) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const actual = request.headers.get("authorization") ?? "";
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(actual);
  // timingSafeEqual throws on mismatched lengths rather than returning
  // false, so that case has to be handled separately first.
  return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
}

// Triggered by Vercel Cron (see vercel.json) every few minutes. Vercel
// automatically sends "Authorization: Bearer <CRON_SECRET>" on cron-invoked
// requests when that env var is set — checking it stops anyone else on the
// internet from hitting this URL and spamming every worker's phone.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vercel Cron is UTC-only while the business notification window is Zagreb
  // local time. Keep this guard before sendDueReminders(), whose first action
  // is a Neon query, so the database stays suspended outside business hours.
  if (!isNotificationPollingWindow(new Date())) {
    return NextResponse.json({ skipped: "outside-notification-window" });
  }

  const results = await sendDueReminders();
  return NextResponse.json({ results });
}
