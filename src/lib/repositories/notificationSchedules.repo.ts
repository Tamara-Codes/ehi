import { db } from "@/lib/db/client";
import { notificationSchedules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Used both for the admin settings list (order matters, earliest first)
// and by the cron job scanning every schedule (order is irrelevant there).
export async function listSchedules() {
  return db
    .select()
    .from(notificationSchedules)
    .orderBy(notificationSchedules.notificationTime);
}

export async function createSchedule(message: string, time: string, days: number[]) {
  const [row] = await db
    .insert(notificationSchedules)
    .values({ message, notificationTime: time, notifyDays: days })
    .returning();
  return row;
}

export async function updateSchedule(
  id: number,
  message: string,
  time: string,
  days: number[],
) {
  const [row] = await db
    .update(notificationSchedules)
    .set({ message, notificationTime: time, notifyDays: days, updatedAt: new Date() })
    .where(eq(notificationSchedules.id, id))
    .returning();
  return row;
}

export async function deleteSchedule(id: number) {
  await db.delete(notificationSchedules).where(eq(notificationSchedules.id, id));
}

export async function markScheduleNotified(id: number, date: string) {
  await db
    .update(notificationSchedules)
    .set({ lastNotifiedDate: date })
    .where(eq(notificationSchedules.id, id));
}
