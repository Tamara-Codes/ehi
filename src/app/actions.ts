"use server";

import {
  createEntryForCurrentUser,
  requestMediaUploadUrls,
  type EntryInput,
  type SelectedFile,
  type UploadedMedia,
} from "@/lib/services/entries.service";
import { subscribeCurrentUser } from "@/lib/services/push.service";

// Called directly from the report form (a Client Component) before any
// files are uploaded — see requestMediaUploadUrls for why uploads go
// straight from the browser to R2 instead of through a Server Action.
export async function requestMediaUploadUrlsAction(files: SelectedFile[]) {
  return requestMediaUploadUrls(files);
}

// Called after the browser has finished uploading every file straight to
// R2 — this just records the report itself, referencing what was uploaded
// by key. Server Actions can be imported and called like a regular async
// function from a Client Component; Next.js handles sending the call to the
// server and back automatically (same pattern as subscribeToPushAction).
//
// Deliberately doesn't call redirect() itself: redirect() inside a Server
// Action still does the navigation client-side, but because it lands back
// on the same route ("/", just with ?saved=1"), React keeps the calling
// form component mounted rather than remounting it — so its own "saving..."
// state would never reset. Returning here and letting the caller navigate
// (and reset its own state) avoids that.
export async function submitEntryAction(
  input: EntryInput,
  siteId: number,
  batchToken: string,
  media: UploadedMedia[],
) {
  await createEntryForCurrentUser(input, siteId, batchToken, media);
}

// Called directly from the client-side "enable notifications" button — not
// bound to a <form>. Server Actions can be imported and called like a
// regular async function from a Client Component; Next.js handles sending
// the call to the server and back automatically.
export async function subscribeToPushAction(subscription: unknown) {
  await subscribeCurrentUser(subscription);
}
