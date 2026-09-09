import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// settings is a single-row table — there's only ever one app-wide config.
export async function getSettings() {
  const [row] = await db.select().from(settings).limit(1);
  if (row) return row;
  const [created] = await db.insert(settings).values({}).returning();
  return created;
}

export async function updateNotificationTime(time: string) {
  const current = await getSettings();
  const [row] = await db
    .update(settings)
    .set({ notificationTime: time, updatedAt: new Date() })
    .where(eq(settings.id, current.id))
    .returning();
  return row;
}
