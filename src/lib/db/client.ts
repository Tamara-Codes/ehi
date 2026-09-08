import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Next.js loads .env.local automatically, but standalone scripts (seed.ts,
// one-off checks run via `tsx`) don't get that for free — this makes the
// module self-sufficient either way. dotenv never overwrites a variable
// that's already set, so this is a no-op under Next.js.
if (!process.env.DATABASE_URL) {
  // Lazy require (not a top-level import) so this only ever runs in the
  // standalone-script case, and never adds cost to the Next.js app itself.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config({ path: ".env.local" });
}

// neon() creates an HTTP-based client — well suited to serverless functions,
// which spin up per-request rather than keeping a long-lived connection open.
const sql = neon(process.env.DATABASE_URL!);

// db is what the rest of the app imports to run queries, e.g. db.select().from(users)
export const db = drizzle(sql, { schema });
