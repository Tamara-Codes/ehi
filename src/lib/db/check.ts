import { db } from "./client";
import { users, sites, entries } from "./schema";

async function check() {
  console.log("Sites:", await db.select().from(sites));
  console.log("Users:", await db.select().from(users));
  console.log("Entries:", await db.select().from(entries));
  process.exit(0);
}

check();
