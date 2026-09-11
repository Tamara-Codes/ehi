import { db } from "./client";
import { users, sites } from "./schema";
import { eq } from "drizzle-orm";

async function getOrCreateSite(name: string) {
  // sites.name has no unique constraint, so onConflictDoNothing() wouldn't
  // actually prevent duplicates here — check for an existing row ourselves
  // instead, so re-running this script stays safe.
  const [existing] = await db.select().from(sites).where(eq(sites.name, name));
  if (existing) return existing;
  const [created] = await db.insert(sites).values({ name }).returning();
  return created;
}

async function ensureAdmin(email: string, name: string) {
  await db
    .insert(users)
    .values({ email, name, role: "admin", status: "active" })
    .onConflictDoNothing();
}

async function seed() {
  // Every active worker can pick from every site — no per-worker
  // assignment — so seeding just needs the sites to exist.
  await getOrCreateSite("Gradilište Sesvete");
  await getOrCreateSite("Dugo Selo 2");

  // Eugen Babić — the client, real admin of the app.
  await ensureAdmin("ehibabic236@gmail.com", "Eugen Babić");

  // Kept as a second admin for ongoing dev/testing alongside Eugen.
  await ensureAdmin("codewithtamara@gmail.com", "Tamara (admin, dev)");

  console.log("Seeded sites + admins (Eugen Babić, Tamara dev).");
}

seed().then(() => process.exit(0));
