import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import {
  listWorkers,
  inviteWorker,
  setWorkerStatus,
} from "@/lib/repositories/users.repo";
import {
  getAllSites,
  createSite,
  assignWorkerToSite,
  unassignWorkerFromSite,
} from "@/lib/repositories/sites.repo";
import { getSettings, updateNotificationSchedule } from "@/lib/repositories/settings.repo";
import {
  getEntryCountsForMonth,
  getEntriesForDate,
  getImagesForEntry,
} from "@/lib/repositories/entries.repo";
import { getSignedImageUrl } from "@/lib/storage";

export async function getWorkers() {
  await requireAdmin();
  return listWorkers();
}

const emailSchema = z.string().trim().email();
const nameSchema = z.string().trim().min(1).max(200);

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

export async function assignSite(userId: number, siteId: number) {
  await requireAdmin();
  return assignWorkerToSite(userId, siteId);
}

export async function unassignSite(userId: number, siteId: number) {
  await requireAdmin();
  return unassignWorkerFromSite(userId, siteId);
}

export async function getNotificationSettings() {
  await requireAdmin();
  return getSettings();
}

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time (HH:MM)");
const daysSchema = z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one day");

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

  return Promise.all(
    entries.map(async (entry) => {
      const images = await getImagesForEntry(entry.id);
      const imageUrls = await Promise.all(
        images.map((img) => getSignedImageUrl(img.storageKey)),
      );
      return { ...entry, imageUrls };
    }),
  );
}
