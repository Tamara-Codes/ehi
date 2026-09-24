// Single source of truth for "what day/time is it right now, for this
// business" — EHI Babić operates in Croatia, so "today" and "16:00" always
// mean Europe/Zagreb local time, regardless of which timezone the server
// process itself happens to run in (Vercel's serverless functions default
// to UTC). Before this existed, entries.service.ts and push.service.ts each
// computed "today" a different, subtly wrong way — see the code review that
// found this. Everything that needs "today" or "what time is it" for
// business-logic purposes (not just display) should go through here.
const BUSINESS_TIMEZONE = "Europe/Zagreb";

/**
 * "YYYY-MM-DD" for the given instant, in Europe/Zagreb local time.
 * Uses Intl.DateTimeFormat rather than Date's own getFullYear/getMonth/
 * getDate, which reflect the SERVER's local timezone, not the business's.
 */
export function businessDateString(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  // en-CA's formatToParts happens to give year/month/day directly in
  // YYYY-MM-DD order's components, assembled explicitly here rather than
  // relying on the locale's separator/ordering as a implementation detail.
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** 0=Sunday..6=Saturday, matching JS Date.getDay()'s convention, but for
 * Europe/Zagreb local time rather than the server's own timezone. */
export function businessDayOfWeek(instant: Date): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    weekday: "short",
  }).format(instant);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.indexOf(weekday);
}

/** "HH:MM" for the given instant, in Europe/Zagreb local time (24-hour). */
export function businessTimeString(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("hour")}:${get("minute")}`;
}

/** Whether an instant falls inside the 09:00–17:00 Zagreb notification window. */
export function isNotificationPollingWindow(instant: Date): boolean {
  const time = businessTimeString(instant);
  return time >= "09:00" && time < "17:00";
}
