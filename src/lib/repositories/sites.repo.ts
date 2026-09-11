import { db } from "@/lib/db/client";
import { sites } from "@/lib/db/schema";

export async function getAllSites() {
  return db.select().from(sites).orderBy(sites.name);
}

export async function createSite(name: string) {
  const [row] = await db.insert(sites).values({ name }).returning();
  return row;
}
