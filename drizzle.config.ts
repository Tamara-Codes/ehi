import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// dotenv defaults to loading ".env" — we need it to read ".env.local" instead,
// since that's the file Next.js itself uses.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
