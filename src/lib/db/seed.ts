import { db } from "./client";
import { users, sites } from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  // sites.name has no unique constraint, so onConflictDoNothing() wouldn't
  // actually prevent duplicates here — check for an existing row ourselves
  // instead, so re-running this script stays safe.
  const [existingSite] = await db
    .select()
    .from(sites)
    .where(eq(sites.name, "Gradilište Sesvete"));

  const testSite =
    existingSite ??
    (await db.insert(sites).values({ name: "Gradilište Sesvete" }).returning())[0];

  await db
    .insert(users)
    .values({
      email: "codewithtamara@gmail.com",
      name: "Tamara (admin, dev)",
      role: "admin",
      status: "active",
      siteId: testSite.id,
    })
    .onConflictDoNothing();

  // Belt-and-suspenders: if the user already existed from a previous seed
  // run (before siteId was added here), make sure it's set now too.
  await db
    .update(users)
    .set({ siteId: testSite.id })
    .where(eq(users.email, "codewithtamara@gmail.com"));

  console.log("Seeded site + admin user, assigned to site:", testSite.name);
}

seed().then(() => process.exit(0));
