"use server";

import { createEntryForCurrentUser } from "@/lib/services/entries.service";
import { subscribeCurrentUser } from "@/lib/services/push.service";
import { redirect } from "next/navigation";

// This is what our <form> below actually calls on submit. It only ever runs
// on the server — the browser never sees this function's code, only a stub
// that knows how to trigger it (the mechanism we walked through earlier).
export async function submitEntryAction(formData: FormData) {
  // FormData gives us everything as strings — checkboxes only appear in
  // FormData at all when checked, so presence (not value) is what we check.
  // getAll("images") returns every file the user attached under that name;
  // an empty/unselected file input still shows up as one zero-byte File, so
  // we filter those out.
  const images = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const siteId = Number(formData.get("siteId"));

  await createEntryForCurrentUser(
    {
      description: String(formData.get("description") ?? ""),
      materialOnSite: formData.get("materialOnSite") === "on",
      hasExtraPaidWork: formData.get("hasExtraPaidWork") === "on",
      hasProblems: formData.get("hasProblems") === "on",
      needsOrder: formData.get("needsOrder") === "on",
    },
    images,
    siteId,
  );

  redirect("/?saved=1");
}

// Called directly from the client-side "enable notifications" button — not
// bound to a <form>. Server Actions can be imported and called like a
// regular async function from a Client Component; Next.js handles sending
// the call to the server and back automatically.
export async function subscribeToPushAction(subscription: unknown) {
  await subscribeCurrentUser(subscription);
}
