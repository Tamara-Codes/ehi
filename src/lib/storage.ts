import "@/lib/loadEnv";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Cloudflare R2 speaks the same protocol as Amazon S3, so we use AWS's own
// client library, just pointed at Cloudflare's endpoint instead of Amazon's.
const r2 = new S3Client({
  region: "auto", // R2 doesn't use AWS regions; "auto" is its convention
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

/**
 * Generates a storage key plus a short-lived signed PUT URL, so the worker's
 * browser can upload the file bytes straight to R2 — never through our own
 * server. That matters most for video: routing large files through a Next.js
 * Server Action would hit its request body size limit (1MB by default) and
 * tie up a serverless function for the whole upload. batchToken namespaces
 * a single submission's files together, generated fresh per report by the
 * caller (before the entry itself exists yet — uploads happen before the
 * entry row is created, so keys can't be namespaced by entry id).
 */
export async function createUploadUrl(
  batchToken: string,
  contentType: string,
  expiresInSeconds = 900,
) {
  const key = `entries/${batchToken}/${randomUUID()}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: expiresInSeconds });

  return { key, uploadUrl };
}

/**
 * Confirms an object the client claims to have uploaded actually exists and
 * is within the expected size — a worker holds a valid signed PUT URL only
 * for their own upload, but nothing stops it being used to upload something
 * larger than what was declared when the URL was requested (a signed PUT URL
 * doesn't constrain Content-Length). Called before trusting the key enough
 * to attach it to an entry.
 */
export async function getObjectSize(key: string): Promise<number | null> {
  try {
    const res = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return res.ContentLength ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads just the leading bytes of an uploaded object — enough for
 * matchesImageSignature/matchesVideoSignature to check the real file content
 * against its declared type, without downloading the whole (possibly
 * hundreds-of-MB) file.
 */
export async function readObjectPrefix(key: string, length = 32): Promise<Buffer> {
  const res = await r2.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: `bytes=0-${length - 1}` }),
  );
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Generates a temporary, signed URL for viewing one image — expires after
 * `expiresInSeconds`. This is how we keep the bucket private: nobody can
 * fetch an image without first being authorized (see entries.service.ts),
 * and even then the link stops working after a short window.
 */
export async function getSignedImageUrl(
  storageKey: string,
  expiresInSeconds = 300,
) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: storageKey });
  return getSignedUrl(r2, command, { expiresIn: expiresInSeconds });
}
