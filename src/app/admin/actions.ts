"use server";

import { revalidatePath } from "next/cache";
import {
  addWorker,
  updateWorkerStatus,
  addSite,
  assignSite,
  unassignSite,
  setNotificationTime,
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

export async function setNotificationTimeAction(formData: FormData) {
  await setNotificationTime(String(formData.get("time") ?? ""));
  revalidatePath("/admin/settings");
}
