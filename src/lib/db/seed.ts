import { db } from "./client";
import { users } from "./schema";

async function seed() {
  await db
    .insert(users)
    .values({
      email: "codewithtamara@gmail.com",
      name: "Tamara (admin, dev)",
      role: "admin",
      status: "active",
    })
    .onConflictDoNothing();

  console.log("Seeded admin user.");
}

seed().then(() => process.exit(0));
