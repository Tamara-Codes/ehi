import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import {
  listWorkers,
  inviteWorker,
  setWorkerStatus,
  deleteWorker,
} from "@/lib/repositories/users.repo";
import { getAllSites, createSite, deleteSite } from "@/lib/repositories/sites.repo";

// Postgres error code 23503 = foreign key violation. Deleting a worker or a
// site both have the same shape of problem: if any entries still reference
// them, the delete should fail with a clear reason rather than either a raw
// DB error or (worse) silently cascading and wiping out historical reports
// — so ON DELETE is left as the default RESTRICT everywhere, and this is
// the one place that turns that specific failure into a friendly message.
async function deleteOrExplainFkViolation(action: () => Promise<void>, friendlyMessage: string) {
  try {
    await action();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "23503") {
      throw new Error(friendlyMessage);
    }
    throw err;
  }
}
import { getSettings, updateNotificationSchedule } from "@/lib/repositories/settings.repo";
import {
  getEntryCountsForMonth,
  getEntriesForDate,
  getImagesForEntries,
} from "@/lib/repositories/entries.repo";
import { getSignedImageUrl } from "@/lib/storage";

export async function getWorkers() {
  await requireAdmin();
  return listWorkers();
}

// Exported for direct unit testing — see admin.service.test.ts.
// .toLowerCase() matters: Google's OAuth email claim is lowercase, and
// admin-entered addresses shouldn't have to match it byte-for-byte or the
// signIn allowlist check in auth.ts (a case-sensitive eq()) silently
// blocks a legitimately-invited worker forever with no error explaining
// why.
export const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((email) => email.toLowerCase());
export const nameSchema = z.string().trim().min(1).max(200);

export async function addWorker(email: string, name: string) {
  await requireAdmin();
  const validEmail = emailSchema.parse(email);
  const validName = nameSchema.parse(name);
  return inviteWorker(validEmail, validName);
}

export async function updateWorkerStatus(userId: number, status: "active" | "inactive") {
  await requireAdmin();
  return setWorkerStatus(userId, status);
}

export async function getSites() {
  await requireAdmin();
  return getAllSites();
}

export async function addSite(name: string) {
  await requireAdmin();
  const validName = nameSchema.parse(name);
  return createSite(validName);
}

export async function removeSite(id: number) {
  await requireAdmin();
  await deleteOrExplainFkViolation(
    () => deleteSite(id),
    "Ovo gradilište ima povezane unose i ne može se obrisati.",
  );
}

export async function removeWorker(userId: number) {
  await requireAdmin();
  await deleteOrExplainFkViolation(
    () => deleteWorker(userId),
    "Ovaj radnik ima povezane unose i ne može se obrisati — umjesto toga ga deaktivirajte.",
  );
}

export async function getNotificationSettings() {
  await requireAdmin();
  return getSettings();
}

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time (HH:MM)");
export const daysSchema = z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one day");

export async function setNotificationSchedule(time: string, days: number[]) {
  await requireAdmin();
  const validTime = timeSchema.parse(time);
  const validDays = daysSchema.parse(days);
  return updateNotificationSchedule(`${validTime}:00`, validDays);
}

// year: 4-digit, month: 1-12. Returns a map of "YYYY-MM-DD" -> entry count,
// for drawing dots on the calendar grid.
export async function getEntryCountsForCalendarMonth(year: number, month: number) {
  await requireAdmin();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const rows = await getEntryCountsForMonth(startDate, endDate);
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.entryDate] = row.count;
  return counts;
}

export async function getEntriesForDay(date: string) {
  await requireAdmin();
  const entries = await getEntriesForDate(date);

  // One batched query for every entry's images, instead of one query per
  // entry — see getImagesForEntries's comment for why that matters on this
  // driver.
  const allImages = await getImagesForEntries(entries.map((e) => e.id));
  const imagesByEntryId = new Map<number, typeof allImages>();
  for (const image of allImages) {
    const list = imagesByEntryId.get(image.entryId) ?? [];
    list.push(image);
    imagesByEntryId.set(image.entryId, list);
  }

  return Promise.all(
    entries.map(async (entry) => {
      const images = imagesByEntryId.get(entry.id) ?? [];
      const imageUrls = await Promise.all(
        images.map((img) => getSignedImageUrl(img.storageKey)),
      );
      return { ...entry, imageUrls };
    }),
  );
}
