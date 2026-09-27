import { describe, it, expect } from "vitest";
import {
  businessDateString,
  businessDayOfWeek,
  businessTimeString,
  isNotificationPollingWindow,
} from "./businessDate";

describe("businessDate (Europe/Zagreb)", () => {
  // 2026-09-09 is in CEST (UTC+2) — Croatia's daylight-saving offset in
  // September. 14:00 UTC is therefore 16:00 Zagreb local time.
  const CEST_INSTANT = new Date(Date.UTC(2026, 8, 9, 14, 0)); // Wed 16:00 Zagreb

  it("converts a UTC instant to the correct Zagreb local date", () => {
    expect(businessDateString(CEST_INSTANT)).toBe("2026-09-09");
  });

  it("converts a UTC instant to the correct Zagreb local time", () => {
    expect(businessTimeString(CEST_INSTANT)).toBe("16:00");
  });

  it("gets the correct day of week for a Zagreb-local Wednesday", () => {
    expect(businessDayOfWeek(CEST_INSTANT)).toBe(3); // Wed
  });

  it("rolls over to the next local day near UTC midnight (the core bug this fixes)", () => {
    // 2026-09-08 23:00 UTC = 2026-09-09 01:00 Zagreb (CEST, UTC+2) — a plain
    // toISOString().slice(0,10) on this instant would incorrectly say
    // "2026-09-08", a full day off from what the worker experienced locally.
    const nearMidnightUTC = new Date(Date.UTC(2026, 8, 8, 23, 0));
    expect(businessDateString(nearMidnightUTC)).toBe("2026-09-09");
  });

  it("handles the CET (winter, UTC+1) offset correctly, not just CEST", () => {
    // 2026-01-15 15:00 UTC = 16:00 Zagreb in winter (CET, UTC+1).
    const winterInstant = new Date(Date.UTC(2026, 0, 15, 15, 0));
    expect(businessTimeString(winterInstant)).toBe("16:00");
    expect(businessDateString(winterInstant)).toBe("2026-01-15");
  });

  it("limits weekday notification polling to 08:00–17:00 Zagreb time across DST", () => {
    // 06:00 UTC is 08:00 CEST; 15:00 UTC is 17:00 CEST.
    expect(isNotificationPollingWindow(new Date(Date.UTC(2026, 8, 9, 6, 0)))).toBe(true);
    expect(isNotificationPollingWindow(new Date(Date.UTC(2026, 8, 9, 15, 0)))).toBe(false);

    // 07:00 UTC is 08:00 CET; 16:00 UTC is 17:00 CET.
    expect(isNotificationPollingWindow(new Date(Date.UTC(2026, 0, 15, 7, 0)))).toBe(true);
    expect(isNotificationPollingWindow(new Date(Date.UTC(2026, 0, 15, 16, 0)))).toBe(false);
  });

  it("stops at 16:00 Saturday and resumes at 08:00 Monday Zagreb time", () => {
    // 2026-09-12 is Saturday and CEST is UTC+2.
    expect(isNotificationPollingWindow(new Date(Date.UTC(2026, 8, 12, 13, 45)))).toBe(true);
    expect(isNotificationPollingWindow(new Date(Date.UTC(2026, 8, 12, 14, 0)))).toBe(false);

    // Sunday remains closed, even during its normal weekday hours.
    expect(isNotificationPollingWindow(new Date(Date.UTC(2026, 8, 13, 8, 0)))).toBe(false);

    // 2026-09-14 is Monday; 06:00 UTC is 08:00 Zagreb.
    expect(isNotificationPollingWindow(new Date(Date.UTC(2026, 8, 14, 5, 45)))).toBe(false);
    expect(isNotificationPollingWindow(new Date(Date.UTC(2026, 8, 14, 6, 0)))).toBe(true);
  });

  it("gets the correct day of week across the full week", () => {
    // 2026-09-06 was a Sunday; walk Sun..Sat using UTC noon (never crosses
    // a Zagreb day boundary either direction) to isolate day-of-week logic.
    const expected = [0, 1, 2, 3, 4, 5, 6];
    for (let i = 0; i < 7; i++) {
      const instant = new Date(Date.UTC(2026, 8, 6 + i, 12, 0));
      expect(businessDayOfWeek(instant), `day offset ${i}`).toBe(expected[i]);
    }
  });
});
