import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function listWorkers() {
  return db.select().from(users).where(eq(users.role, "worker")).orderBy(users.name);
}

export async function inviteWorker(email: string, name: string) {
  const [row] = await db
    .insert(users)
    .values({ email, name, role: "worker", status: "invited" })
    .onConflictDoNothing()
    .returning();
  return row;
}

export async function setWorkerStatus(userId: number, status: "active" | "inactive") {
  await db.update(users).set({ status }).where(eq(users.id, userId));
}

export async function deleteWorker(userId: number) {
  await db.delete(users).where(eq(users.id, userId));
}
