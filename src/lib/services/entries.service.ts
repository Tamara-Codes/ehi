import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { userSites } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { insertEntry, insertEntryImages } from "@/lib/repositories/entries.repo";
import { uploadEntryImage } from "@/lib/storage";
import { matchesImageSignature } from "@/lib/imageSignature";

// Validates the shape/size of what the client sent us, before it's trusted
// anywhere else. This is the boundary check from our security plan.
// Exported for direct unit testing — see entries.service.test.ts.
export const entryInputSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(2000),
  materialOnSite: z.boolean(),
  materialMissingNote: z.string().trim().max(500).optional(),
  hasExtraPaidWork: z.boolean(),
  extraPaidWorkNote: z.string().trim().max(500).optional(),
  hasProblems: z.boolean(),
  problemsNote: z.string().trim().max(500).optional(),
  needsOrder: z.boolean(),
  orderNote: z.string().trim().max(500).optional(),
});

export type EntryInput = z.infer<typeof entryInputSchema>;

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

// A toggle's note only ever means something when the toggle is in the
// state that makes it relevant (ON for the three "describe the issue"
// toggles, OFF for materialOnSite's inverted "what's missing" case) — a
// client could technically send note text alongside the "wrong" toggle
// state, and this is where that gets discarded rather than stored as if
// it meant something. Pure function, exported for direct unit testing.
export function deriveNoteFields(parsed: EntryInput) {
  return {
    materialMissingNote: !parsed.materialOnSite ? (parsed.materialMissingNote ?? null) : null,
    extraPaidWorkNote: parsed.hasExtraPaidWork ? (parsed.extraPaidWorkNote ?? null) : null,
    problemsNote: parsed.hasProblems ? (parsed.problemsNote ?? null) : null,
    orderNote: parsed.needsOrder ? (parsed.orderNote ?? null) : null,
  };
}

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
  // same "validate at the boundary" rule as the text fields above. We read
  // each file's actual bytes here (not just trust the declared type/size)
  // so a hand-crafted request claiming to be a JPEG can't slip something
  // else through — see matchesImageSignature.
  if (images.length > MAX_IMAGES) {
    throw new Error(`Too many images (max ${MAX_IMAGES})`);
  }
  const imageBuffers: Buffer[] = [];
  for (const image of images) {
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      throw new Error(`Unsupported image type: ${image.type}`);
    }
    if (image.size > MAX_IMAGE_BYTES) {
      throw new Error(`Image too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)`);
    }
    const buffer = Buffer.from(await image.arrayBuffer());
    if (!matchesImageSignature(buffer, image.type)) {
      throw new Error(`File content doesn't match declared type: ${image.type}`);
    }
    imageBuffers.push(buffer);
  }

  // entryDate is today's date, set here on the server — never something the
  // client is allowed to pick, so nobody can backdate/forward-date an entry.
  const today = new Date().toISOString().slice(0, 10);

  const noteFields = deriveNoteFields(parsed);

  const entry = await insertEntry({
    userId: session.user.id,
    siteId,
    entryDate: today,
    description: parsed.description,
    materialOnSite: parsed.materialOnSite,
    hasExtraPaidWork: parsed.hasExtraPaidWork,
    hasProblems: parsed.hasProblems,
    needsOrder: parsed.needsOrder,
    ...noteFields,
  });

  const storageKeys: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const key = await uploadEntryImage(entry.id, imageBuffers[i], images[i].type);
    storageKeys.push(key);
  }
  await insertEntryImages(entry.id, storageKeys);

  return entry;
}
