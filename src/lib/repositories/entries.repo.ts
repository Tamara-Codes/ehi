import { db } from "@/lib/db/client";
import { entries, entryImages, users, sites } from "@/lib/db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

// A repository only knows how to read/write rows — no auth checks, no
// business rules. That logic lives one layer up, in the service.
export type NewEntry = typeof entries.$inferInsert;

export async function insertEntry(data: NewEntry) {
  const [row] = await db.insert(entries).values(data).returning();
  return row;
}

export async function insertEntryImages(entryId: number, storageKeys: string[]) {
  if (storageKeys.length === 0) return [];
  return db
    .insert(entryImages)
    .values(storageKeys.map((storageKey) => ({ entryId, storageKey })))
    .returning();
}

// For the calendar grid: how many entries landed on each date within a
// month — just enough to draw a dot per day, not the full entry data.
export async function getEntryCountsForMonth(startDate: string, endDate: string) {
  return db
    .select({
      entryDate: entries.entryDate,
      count: sql<number>`count(*)::int`,
    })
    .from(entries)
    .where(and(gte(entries.entryDate, startDate), lte(entries.entryDate, endDate)))
    .groupBy(entries.entryDate);
}

// For the day-detail panel below the calendar: full entries for one
// specific date, worker/site names attached.
export async function getEntriesForDate(date: string) {
  return db
    .select({
      id: entries.id,
      entryDate: entries.entryDate,
      description: entries.description,
      materialOnSite: entries.materialOnSite,
      hasExtraPaidWork: entries.hasExtraPaidWork,
      hasProblems: entries.hasProblems,
      needsOrder: entries.needsOrder,
      createdAt: entries.createdAt,
      workerName: users.name,
      siteName: sites.name,
    })
    .from(entries)
    .innerJoin(users, eq(entries.userId, users.id))
    .innerJoin(sites, eq(entries.siteId, sites.id))
    .where(eq(entries.entryDate, date))
    .orderBy(desc(entries.createdAt));
}

export async function getImagesForEntry(entryId: number) {
  return db.select().from(entryImages).where(eq(entryImages.entryId, entryId));
}
