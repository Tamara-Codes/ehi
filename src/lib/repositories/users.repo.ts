import { db } from "@/lib/db/client";
import { users, userSites, sites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function listWorkers() {
  const workers = await db
    .select()
    .from(users)
    .where(eq(users.role, "worker"))
    .orderBy(users.name);

  // One extra query for all site assignments, joined in memory — simpler
  // and still fast at this scale (a handful of workers) than N+1 queries.
  const assignments = await db
    .select({ userId: userSites.userId, siteId: sites.id, siteName: sites.name })
    .from(userSites)
    .innerJoin(sites, eq(userSites.siteId, sites.id));

  return workers.map((worker) => ({
    ...worker,
    sites: assignments.filter((a) => a.userId === worker.id),
  }));
}

export async function inviteWorker(email: string, name: string) {
  const [row] = await db
    .insert(users)
    .values({ email, name, role: "worker", status: "invited" })
    .onConflictDoNothing()
    .returning();
  return row;
}

export async function setWorkerStatus(userId: number, status: "active" | "inactive") {
  await db.update(users).set({ status }).where(eq(users.id, userId));
}
