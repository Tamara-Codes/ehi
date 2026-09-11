import { z } from "zod";
import { db } from "@/lib/db/client";
import { sites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { insertEntry, insertEntryImages } from "@/lib/repositories/entries.repo";
import { uploadEntryImage } from "@/lib/storage";
import { matchesImageSignature } from "@/lib/imageSignature";
import { businessDateString } from "@/lib/businessDate";
import { requireUser } from "@/lib/auth-guards";

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
  // services, not trust in the client" rule from earlier. requireUser (not
  // a bare auth() check) also re-verifies the worker is still active, so a
  // deactivated worker can't keep submitting entries on a still-valid
  // session cookie — see auth-guards.ts.
  const session = await requireUser();

  const parsed = entryInputSchema.parse(input);

  // The client picked a site pill in the UI, but we don't trust that value
  // blindly — every active worker can pick any site (no per-worker
  // assignment), but the siteId itself still needs to be a real row, not
  // an arbitrary/spoofed number that would violate the entries table's
  // foreign key at insert time with a less clear error.
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) {
    throw new Error("Site not found");
  }

  // Reject bad images before anything touches R2 or the database — the
  // same "validate at the boundary" rule as the text fields above. We read
  // each file's actual bytes here (not just trust the declared type/size)
  // so a hand-crafted request claiming to be a JPEG can't slip something
  // else through — see matchesImageSignature.
  if (images.length > MAX_IMAGES) {
    throw new Error(`Too many images (max ${MAX_IMAGES})`);
  }
  // These reads/checks don't depend on each other, so run them concurrently
  // rather than one-at-a-time — matters for the upload loop below more than
  // here (no network I/O in this part), but keeps the two loops consistent.
  const imageBuffers: Buffer[] = await Promise.all(
    images.map(async (image) => {
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
      return buffer;
    }),
  );

  // entryDate is today's date, set here on the server — never something the
  // client is allowed to pick, so nobody can backdate/forward-date an entry.
  // businessDateString (not toISOString/UTC) so a worker submitting near
  // midnight local time gets today's actual local date, not UTC's.
  const today = businessDateString(new Date());

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

  // Each upload is an independent network round-trip to R2 — running them
  // concurrently instead of one-at-a-time matters here, since a worker with
  // several photos would otherwise sit through N sequential upload
  // latencies on the entry-submission hot path.
  const storageKeys = await Promise.all(
    imageBuffers.map((buffer, i) => uploadEntryImage(entry.id, buffer, images[i].type)),
  );
  await insertEntryImages(entry.id, storageKeys);

  return entry;
}
