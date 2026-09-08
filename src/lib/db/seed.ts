import { db } from "./client";
import { users, sites, userSites } from "./schema";
import { and, eq } from "drizzle-orm";

async function getOrCreateSite(name: string) {
  // sites.name has no unique constraint, so onConflictDoNothing() wouldn't
  // actually prevent duplicates here — check for an existing row ourselves
  // instead, so re-running this script stays safe.
  const [existing] = await db.select().from(sites).where(eq(sites.name, name));
  if (existing) return existing;
  const [created] = await db.insert(sites).values({ name }).returning();
  return created;
}

async function assignSite(userId: number, siteId: number) {
  const [existing] = await db
    .select()
    .from(userSites)
    .where(and(eq(userSites.userId, userId), eq(userSites.siteId, siteId)));
  if (existing) return;
  await db.insert(userSites).values({ userId, siteId });
}

async function seed() {
  const siteA = await getOrCreateSite("Gradilište Sesvete");
  const siteB = await getOrCreateSite("Dugo Selo 2");

  await db
    .insert(users)
    .values({
      email: "codewithtamara@gmail.com",
      name: "Tamara (admin, dev)",
      role: "admin",
      status: "active",
    })
    .onConflictDoNothing();

  const [testUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "codewithtamara@gmail.com"));

  await assignSite(testUser.id, siteA.id);
  await assignSite(testUser.id, siteB.id);

  console.log("Seeded sites + admin user, assigned to:", siteA.name, "&", siteB.name);
}

seed().then(() => process.exit(0));
