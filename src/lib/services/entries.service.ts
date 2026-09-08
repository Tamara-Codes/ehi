import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { userSites } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { insertEntry, insertEntryImages } from "@/lib/repositories/entries.repo";
import { uploadEntryImage } from "@/lib/storage";

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

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export async function createEntryForCurrentUser(
  input: EntryInput,
  images: File[],
  siteId: number,
) {
  // Everything here derives from the server-side session, never from
  // anything the client claims — this is the "row-level scoping in
  // services, not trust in the client" rule from earlier.
  const session = await auth();
  if (!session) {
    throw new Error("Not authenticated");
  }

  const parsed = entryInputSchema.parse(input);

  // The client picked a site pill in the UI, but we don't trust that value
  // blindly — confirm this worker is actually assigned to it, so nobody can
  // submit an entry against a site they don't belong to just by tampering
  // with the form.
  const [assignment] = await db
    .select()
    .from(userSites)
    .where(and(eq(userSites.userId, session.user.id), eq(userSites.siteId, siteId)));

  if (!assignment) {
    throw new Error("Not assigned to this site");
  }

  // Reject bad images before anything touches R2 or the database — the
  // same "validate at the boundary" rule as the text fields above.
  if (images.length > MAX_IMAGES) {
    throw new Error(`Too many images (max ${MAX_IMAGES})`);
  }
  for (const image of images) {
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      throw new Error(`Unsupported image type: ${image.type}`);
    }
    if (image.size > MAX_IMAGE_BYTES) {
      throw new Error(`Image too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)`);
    }
  }

  // entryDate is today's date, set here on the server — never something the
  // client is allowed to pick, so nobody can backdate/forward-date an entry.
  const today = new Date().toISOString().slice(0, 10);

  const entry = await insertEntry({
    userId: session.user.id,
    siteId,
    entryDate: today,
    description: parsed.description,
    materialOnSite: parsed.materialOnSite,
    hasExtraPaidWork: parsed.hasExtraPaidWork,
    hasProblems: parsed.hasProblems,
    needsOrder: parsed.needsOrder,
  });

  const storageKeys: string[] = [];
  for (const image of images) {
    const buffer = Buffer.from(await image.arrayBuffer());
    const key = await uploadEntryImage(entry.id, buffer, image.type);
    storageKeys.push(key);
  }
  await insertEntryImages(entry.id, storageKeys);

  return entry;
}
