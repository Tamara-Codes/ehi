import { describe, it, expect } from "vitest";
import { computeReminderDecision, subscriptionSchema, type ReminderSettings } from "./push.service";

const validKeys = { p256dh: "some-key-material", auth: "some-auth-secret" };

describe("subscriptionSchema (SSRF allowlist)", () => {
  it("accepts a real Chrome/FCM push endpoint", () => {
    const result = subscriptionSchema.safeParse({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      keys: validKeys,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a real Firefox push endpoint", () => {
    const result = subscriptionSchema.safeParse({
      endpoint: "https://updates.push.services.mozilla.com/wpush/v2/abc123",
      keys: validKeys,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an arbitrary URL — the actual SSRF case", () => {
    const result = subscriptionSchema.safeParse({
      endpoint: "https://internal-admin.example.com/hook",
      keys: validKeys,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a cloud metadata / internal IP endpoint", () => {
    const result = subscriptionSchema.safeParse({
      endpoint: "http://169.254.169.254/latest/meta-data/",
      keys: validKeys,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a lookalike hostname (subdomain trick)", () => {
    // e.g. "fcm.googleapis.com.evil.com" — a naive .includes()/.endsWith()
    // check could be fooled by this; exact hostname equality can't be.
    const result = subscriptionSchema.safeParse({
      endpoint: "https://fcm.googleapis.com.evil.com/fcm/send/abc123",
      keys: validKeys,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed URL rather than throwing", () => {
    const result = subscriptionSchema.safeParse({
      endpoint: "not-a-url",
      keys: validKeys,
    });
    expect(result.success).toBe(false);
  });
});

// A Wednesday (JS Date.getDay() === 3 in Zagreb, since Zagreb's date/day
// don't cross a boundary vs. UTC at these hours), used as the baseline
// "today" across these tests. Built as an explicit UTC instant (Zagreb is
// UTC+2/CEST in September) rather than `new Date(y,m,d,h,mi)`, which is
// interpreted in the *test-running machine's own* local timezone —
// computeReminderDecision now converts through Europe/Zagreb explicitly
// regardless of that, so the test needs to construct the instant the same
// deterministic way (see businessDate.test.ts for the same pattern).
function wednesdayAt(hour: number, minute: number) {
  return new Date(Date.UTC(2026, 8, 9, hour - 2, minute)); // 2026-09-09, CEST = UTC+2
}

const baseSettings: ReminderSettings = {
  lastNotifiedDate: null,
  notifyDays: [0, 1, 2, 3, 4, 5, 6], // every day
  notificationTime: "16:00:00",
};

describe("computeReminderDecision", () => {
  it("is due once the clock reaches the target time", () => {
    const result = computeReminderDecision(baseSettings, wednesdayAt(16, 0));
    expect(result).toEqual({ due: true });
  });

  it("is due any time after the target time, not just exactly at it", () => {
    const result = computeReminderDecision(baseSettings, wednesdayAt(18, 45));
    expect(result).toEqual({ due: true });
  });

  it("is not due before the target time", () => {
    const result = computeReminderDecision(baseSettings, wednesdayAt(15, 59));
    expect(result).toEqual({ due: false, reason: "not-yet-time" });
  });

  it("is not due one minute before the target time", () => {
    const result = computeReminderDecision(
      { ...baseSettings, notificationTime: "09:05:00" },
      wednesdayAt(9, 4),
    );
    expect(result).toEqual({ due: false, reason: "not-yet-time" });
  });

  it("respects notifyDays — skips a day not in the list", () => {
    // Wednesday = 3, excluded here.
    const result = computeReminderDecision(
      { ...baseSettings, notifyDays: [1, 2, 4, 5] },
      wednesdayAt(16, 0),
    );
    expect(result).toEqual({ due: false, reason: "not-a-notify-day" });
  });

  it("sends on a day that is in notifyDays", () => {
    const result = computeReminderDecision(
      { ...baseSettings, notifyDays: [3] },
      wednesdayAt(16, 0),
    );
    expect(result).toEqual({ due: true });
  });

  it("refuses to send twice on the same day even if past the target time", () => {
    const result = computeReminderDecision(
      { ...baseSettings, lastNotifiedDate: "2026-09-09" },
      wednesdayAt(20, 0),
    );
    expect(result).toEqual({ due: false, reason: "already-sent-today" });
  });

  it("sends again on a new day even if it sent yesterday", () => {
    const result = computeReminderDecision(
      { ...baseSettings, lastNotifiedDate: "2026-09-08" },
      wednesdayAt(16, 0),
    );
    expect(result).toEqual({ due: true });
  });

  it("already-sent-today takes priority over not-a-notify-day", () => {
    // Pathological/inconsistent state (shouldn't happen in practice, since
    // markNotifiedToday only runs after a notifyDays check already passed)
    // but the guard order should still be deterministic and safe.
    const result = computeReminderDecision(
      { lastNotifiedDate: "2026-09-09", notifyDays: [], notificationTime: "16:00:00" },
      wednesdayAt(16, 0),
    );
    expect(result).toEqual({ due: false, reason: "already-sent-today" });
  });

  it("handles a notification time with a non-zero minute correctly", () => {
    const settings = { ...baseSettings, notificationTime: "16:30:00" };
    expect(computeReminderDecision(settings, wednesdayAt(16, 29))).toEqual({
      due: false,
      reason: "not-yet-time",
    });
    expect(computeReminderDecision(settings, wednesdayAt(16, 30))).toEqual({ due: true });
  });
});
