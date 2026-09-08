import { db } from "@/lib/db/client";
import { entries, entryImages } from "@/lib/db/schema";

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
