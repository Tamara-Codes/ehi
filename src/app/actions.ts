"use server";

import { createEntryForCurrentUser } from "@/lib/services/entries.service";
import { redirect } from "next/navigation";

// This is what our <form> below actually calls on submit. It only ever runs
// on the server — the browser never sees this function's code, only a stub
// that knows how to trigger it (the mechanism we walked through earlier).
export async function submitEntryAction(formData: FormData) {
  // FormData gives us everything as strings — checkboxes only appear in
  // FormData at all when checked, so presence (not value) is what we check.
  await createEntryForCurrentUser({
    description: String(formData.get("description") ?? ""),
    materialOnSite: formData.get("materialOnSite") === "on",
    hasExtraPaidWork: formData.get("hasExtraPaidWork") === "on",
    hasProblems: formData.get("hasProblems") === "on",
    needsOrder: formData.get("needsOrder") === "on",
  });

  redirect("/?saved=1");
}
