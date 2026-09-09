import { auth } from "@/auth";
import { redirect } from "next/navigation";

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
