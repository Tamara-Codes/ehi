import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";

// A repository only knows how to read/write rows — no auth checks, no
// business rules. That logic lives one layer up, in the service.
export type NewEntry = typeof entries.$inferInsert;

export async function insertEntry(data: NewEntry) {
  const [row] = await db.insert(entries).values(data).returning();
  return row;
}
