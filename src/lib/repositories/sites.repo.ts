import { db } from "@/lib/db/client";
import { sites, userSites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getSitesForUser(userId: number) {
  return db
    .select({ id: sites.id, name: sites.name })
    .from(userSites)
    .innerJoin(sites, eq(userSites.siteId, sites.id))
    .where(eq(userSites.userId, userId));
}
