import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Call at the top of every admin page/Server Action. Redirects non-admins
 * away rather than trusting the UI to hide admin links — matches the
 * "auth checks close to the data, not just in a layout" guidance.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }
  return session;
}

/**
 * Call at the top of every worker-facing Server Action (submitting an
 * entry, subscribing to push). Unlike a bare `auth()` truthiness check,
 * this also re-checks `users.status` against the database on every call —
 * a JWT session cookie stays valid for its full lifetime regardless of
 * later admin action, so without this, an admin clicking "Deaktiviraj" on
 * a worker wouldn't actually revoke that worker's ability to keep writing
 * data until their session cookie happened to expire on its own.
 */
export async function requireUser() {
  const session = await auth();
  if (!session) {
    throw new Error("Not authenticated");
  }

  const [user] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user || user.status !== "active") {
    throw new Error("Account is not active");
  }

  return session;
}
