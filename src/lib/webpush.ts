import "@/lib/loadEnv";
import webpush from "web-push";

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
