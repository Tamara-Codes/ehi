import { db } from "@/lib/db/client";
import { sites, userSites } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function getSitesForUser(userId: number) {
  return db
    .select({ id: sites.id, name: sites.name })
    .from(userSites)
    .innerJoin(sites, eq(userSites.siteId, sites.id))
    .where(eq(userSites.userId, userId));
}

export async function getAllSites() {
  return db.select().from(sites).orderBy(sites.name);
}

export async function createSite(name: string) {
  const [row] = await db.insert(sites).values({ name }).returning();
  return row;
}

export async function assignWorkerToSite(userId: number, siteId: number) {
  const [existing] = await db
    .select()
    .from(userSites)
    .where(and(eq(userSites.userId, userId), eq(userSites.siteId, siteId)));
  if (existing) return existing;
  const [row] = await db.insert(userSites).values({ userId, siteId }).returning();
  return row;
}

export async function unassignWorkerFromSite(userId: number, siteId: number) {
  await db
    .delete(userSites)
    .where(and(eq(userSites.userId, userId), eq(userSites.siteId, siteId)));
}
