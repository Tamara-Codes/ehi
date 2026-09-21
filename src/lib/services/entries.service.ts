import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "@/lib/db/client";
import { sites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { insertEntry, insertEntryImages } from "@/lib/repositories/entries.repo";
import { createUploadUrl, getObjectSize, readObjectPrefix } from "@/lib/storage";
import { matchesImageSignature } from "@/lib/imageSignature";
import { matchesVideoSignature } from "@/lib/videoSignature";
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

const MAX_IMAGES = 100;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
// No count cap on videos (client's call — see conversation), just a
// per-file ceiling to keep any single upload finishing in a reasonable time
// on a construction site's connection.
const MAX_VIDEO_BYTES = 300 * 1024 * 1024; // 300MB
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

export type MediaKind = "image" | "video";
export type SelectedFile = { name: string; type: string; size: number };
export type ClassifiedFile = SelectedFile & { kind: MediaKind };
export type UploadedMedia = { key: string; type: string; kind: MediaKind };

// Figures out image vs. video from the declared MIME type and checks it
// against the per-kind allowlist/size caps — before we ever hand out an R2
// upload URL for it. Pure function, exported for direct unit testing.
export function classifyAndValidateFiles(files: SelectedFile[]): ClassifiedFile[] {
  const imageCount = files.filter((f) => ALLOWED_IMAGE_TYPES.has(f.type)).length;
  if (imageCount > MAX_IMAGES) {
    throw new Error(`Previše slika odjednom (najviše ${MAX_IMAGES}).`);
  }

  return files.map((file) => {
    if (ALLOWED_IMAGE_TYPES.has(file.type)) {
      if (file.size > MAX_IMAGE_BYTES) {
        throw new Error(
          `"${file.name}" je prevelika slika (najviše ${MAX_IMAGE_BYTES / 1024 / 1024}MB).`,
        );
      }
      return { ...file, kind: "image" as const };
    }
    if (ALLOWED_VIDEO_TYPES.has(file.type)) {
      if (file.size > MAX_VIDEO_BYTES) {
        throw new Error(
          `"${file.name}" je prevelik video (najviše ${MAX_VIDEO_BYTES / 1024 / 1024}MB).`,
        );
      }
      return { ...file, kind: "video" as const };
    }
    throw new Error(`"${file.name}" nije podržana vrsta datoteke.`);
  });
}

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

// Step 1 of submitting a report: the worker has picked files but hasn't hit
// "Spremi" yet. We hand back a signed R2 upload URL per file so the browser
// can upload the bytes directly — never through our own server. That's what
// makes video workable at all: a Next.js Server Action caps request bodies
// at 1MB by default, and even raised, funneling a 300MB video through a
// Vercel function risks its execution time/memory limits. batchToken
// namespaces this submission's uploads; the entry row doesn't exist yet
// (nothing's confirmed uploaded), so keys can't be scoped by entry id.
export async function requestMediaUploadUrls(files: SelectedFile[]) {
  await requireUser();

  const classified = classifyAndValidateFiles(files);
  const batchToken = randomUUID();

  const uploads = await Promise.all(
    classified.map(async (file) => {
      const { key, uploadUrl } = await createUploadUrl(batchToken, file.type);
      return { key, uploadUrl, kind: file.kind, type: file.type };
    }),
  );

  return { batchToken, uploads };
}

// Step 2: the browser has finished uploading straight to R2 and is now
// submitting the actual report, referencing what it uploaded by key.
export async function createEntryForCurrentUser(
  input: EntryInput,
  siteId: number,
  batchToken: string,
  media: UploadedMedia[],
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
    throw new Error("Gradilište nije pronađeno.");
  }

  // A key not under this batch's own prefix would mean the request is
  // trying to attach an upload from a different (possibly another worker's)
  // batch to this entry.
  for (const item of media) {
    if (!item.key.startsWith(`entries/${batchToken}/`)) {
      throw new Error("Neispravna referenca na datoteku.");
    }
  }

  // The client only ever *claims* type/size when requesting the upload URL
  // in step 1 — nothing stops it from PUTting something else at that key
  // once it holds a valid signed URL. Re-verify for real before trusting
  // any of this enough to attach it to an entry: the object actually
  // exists, is within the size cap for its kind, and its real bytes match
  // the declared type (see matchesImageSignature/matchesVideoSignature).
  await Promise.all(
    media.map(async (item) => {
      const maxBytes = item.kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      const size = await getObjectSize(item.key);
      if (size === null) {
        throw new Error("Jedna od datoteka nije uspješno otpremljena.");
      }
      if (size > maxBytes) {
        throw new Error(
          `Otpremljena datoteka prelazi dopušteno ograničenje (najviše ${maxBytes / 1024 / 1024}MB).`,
        );
      }
      const prefix = await readObjectPrefix(item.key);
      const matches =
        item.kind === "video"
          ? matchesVideoSignature(prefix, item.type)
          : matchesImageSignature(prefix, item.type);
      if (!matches) {
        throw new Error("Sadržaj datoteke ne odgovara prijavljenoj vrsti.");
      }
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

  await insertEntryImages(
    entry.id,
    media.map((item) => ({ storageKey: item.key, kind: item.kind })),
  );

  return entry;
}
