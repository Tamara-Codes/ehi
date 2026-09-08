import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { insertEntry } from "@/lib/repositories/entries.repo";

// Validates the shape/size of what the client sent us, before it's trusted
// anywhere else. This is the boundary check from our security plan.
const entryInputSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(2000),
  materialOnSite: z.boolean(),
  hasExtraPaidWork: z.boolean(),
  hasProblems: z.boolean(),
  needsOrder: z.boolean(),
});

export type EntryInput = z.infer<typeof entryInputSchema>;

export async function createEntryForCurrentUser(input: EntryInput) {
  // Everything here derives from the server-side session, never from
  // anything the client claims — this is the "row-level scoping in
  // services, not trust in the client" rule from earlier.
  const session = await auth();
  if (!session) {
    throw new Error("Not authenticated");
  }

  const parsed = entryInputSchema.parse(input);

  const [worker] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!worker || !worker.siteId) {
    throw new Error("No site assigned to this user");
  }

  // entryDate is today's date, set here on the server — never something the
  // client is allowed to pick, so nobody can backdate/forward-date an entry.
  const today = new Date().toISOString().slice(0, 10);

  return insertEntry({
    userId: worker.id,
    siteId: worker.siteId,
    entryDate: today,
    description: parsed.description,
    materialOnSite: parsed.materialOnSite,
    hasExtraPaidWork: parsed.hasExtraPaidWork,
    hasProblems: parsed.hasProblems,
    needsOrder: parsed.needsOrder,
  });
}
