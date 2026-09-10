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

async function ensureAdmin(email: string, name: string) {
  await db
    .insert(users)
    .values({ email, name, role: "admin", status: "active" })
    .onConflictDoNothing();
}

async function seed() {
  const siteA = await getOrCreateSite("Gradilište Sesvete");
  const siteB = await getOrCreateSite("Dugo Selo 2");

  // Eugen Babić — the client, real admin of the app.
  await ensureAdmin("ehibabic236@gmail.com", "Eugen Babić");

  // Kept as a second admin for ongoing dev/testing alongside Eugen.
  await ensureAdmin("codewithtamara@gmail.com", "Tamara (admin, dev)");

  const [testUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "codewithtamara@gmail.com"));

  await assignSite(testUser.id, siteA.id);
  await assignSite(testUser.id, siteB.id);

  console.log("Seeded sites + admins (Eugen Babić, Tamara dev).");
}

seed().then(() => process.exit(0));
