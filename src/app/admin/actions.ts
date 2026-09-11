"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addWorker,
  updateWorkerStatus,
  removeWorker,
  addSite,
  removeSite,
  setNotificationSchedule,
} from "@/lib/services/admin.service";

export async function addWorkerAction(formData: FormData) {
  await addWorker(
    String(formData.get("email") ?? ""),
    String(formData.get("name") ?? ""),
  );
  revalidatePath("/admin/team");
}

export async function toggleWorkerStatusAction(formData: FormData) {
  const userId = Number(formData.get("userId"));
  const status = formData.get("status") === "active" ? "active" : "inactive";
  await updateWorkerStatus(userId, status);
  revalidatePath("/admin/team");
}

export async function deleteWorkerAction(formData: FormData) {
  const userId = Number(formData.get("userId"));
  try {
    await removeWorker(userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri brisanju.";
    redirect(`/admin/team?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/team");
}

export async function addSiteAction(formData: FormData) {
  await addSite(String(formData.get("name") ?? ""));
  revalidatePath("/admin/team");
}

export async function deleteSiteAction(formData: FormData) {
  const id = Number(formData.get("siteId"));
  try {
    await removeSite(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri brisanju.";
    redirect(`/admin/team?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/team");
}

export async function setNotificationScheduleAction(formData: FormData) {
  const hour = String(formData.get("hour") ?? "").padStart(2, "0");
  const minute = String(formData.get("minute") ?? "").padStart(2, "0");
  // Checkboxes only appear in FormData when checked, one entry per checked
  // day — getAll collects all of them at once.
  const days = formData.getAll("days").map(Number);
  await setNotificationSchedule(`${hour}:${minute}`, days);
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}
