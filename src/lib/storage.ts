import "@/lib/loadEnv";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
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
 * Uploads image bytes to R2 and returns the storage key (not a public URL —
 * the bucket isn't public. See getSignedImageUrl for how it's read back).
 */
export async function uploadEntryImage(
  entryId: number,
  file: Buffer,
  contentType: string,
) {
  // randomUUID makes the filename unguessable — nobody should be able to
  // find another worker's photo by guessing sequential IDs in the URL.
  const key = `entries/${entryId}/${randomUUID()}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
    }),
  );

  return key;
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
