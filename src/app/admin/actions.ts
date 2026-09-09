"use server";

import { revalidatePath } from "next/cache";
import {
  addWorker,
  updateWorkerStatus,
  addSite,
  assignSite,
  unassignSite,
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

export async function addSiteAction(formData: FormData) {
  await addSite(String(formData.get("name") ?? ""));
  revalidatePath("/admin/team");
}

export async function assignSiteAction(formData: FormData) {
  const userId = Number(formData.get("userId"));
  const siteId = Number(formData.get("siteId"));
  await assignSite(userId, siteId);
  revalidatePath("/admin/team");
}

export async function unassignSiteAction(formData: FormData) {
  const userId = Number(formData.get("userId"));
  const siteId = Number(formData.get("siteId"));
  await unassignSite(userId, siteId);
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
}
