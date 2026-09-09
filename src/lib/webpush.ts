import webpush from "web-push";

// Same self-sufficiency guard as db/client.ts and storage.ts — lets
// standalone scripts run via `tsx` load .env.local themselves.
if (!process.env.VAPID_PRIVATE_KEY) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config({ path: ".env.local" });
}

// VAPID lets a push service (Chrome's, Firefox's, etc.) verify that push
// messages claiming to be from us actually are — the private key signs
// them, the public key (also embedded in each browser's subscription) lets
// the push service verify that signature.
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export { webpush };
