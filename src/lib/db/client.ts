import "@/lib/loadEnv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// neon() creates an HTTP-based client — well suited to serverless functions,
// which spin up per-request rather than keeping a long-lived connection open.
const sql = neon(process.env.DATABASE_URL!);

// db is what the rest of the app imports to run queries, e.g. db.select().from(users)
export const db = drizzle(sql, { schema });
