import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: {
    // JWT strategy: session data lives in an encrypted cookie, not a DB table.
    // We manage our own `users` table separately, so we don't need Auth.js's
    // database-adapter/sessions-table machinery.
    strategy: "jwt",
  },
  callbacks: {
    // Runs every time someone completes Google login. Returning false blocks
    // the login entirely — this is the allowlist check.
    async signIn({ user }) {
      if (!user.email) return false;

      // Lowercase on both sides: workers are pre-registered by the admin
      // via admin.service.ts's emailSchema, which already lowercases on
      // write — this comparison-side normalization is defense-in-depth for
      // any row written before that existed, or if Google's own email
      // claim is ever not already lowercase for some account.
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email.toLowerCase()));

      if (!existing) {
        // Not pre-registered by the admin — deny access.
        return false;
      }

      if (existing.status === "inactive") {
        // Admin deactivated this worker — deny access.
        return false;
      }

      if (existing.status === "invited") {
        // First successful login — mark them active.
        await db
          .update(users)
          .set({ status: "active" })
          .where(eq(users.id, existing.id));
      }

      return true;
    },

    // Runs after signIn succeeds, and on every subsequent request that reads
    // the session. We attach our own role/id here so the rest of the app can
    // check `session.user.role` without a separate DB lookup each time.
    async jwt({ token, user }) {
      if (user?.email) {
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email.toLowerCase()));

        if (existing) {
          token.userId = existing.id;
          token.role = existing.role;
        }
      }
      return token;
    },

    // Auth.js v5 beta ships internally inconsistent types for this callback
    // (its "jwt strategy" and "database strategy" param shapes collide when
    // intersected, and even its own re-exported `Session` type doesn't
    // structurally match itself here) — a known library issue, not something
    // wrong in our code. `any` here is a deliberate, narrow escape hatch from
    // that, not a sign we don't know the real shape: at runtime, with
    // session.strategy = "jwt", `session.user` and `token` are exactly what
    // we treat them as below.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      session.user.id = token.userId;
      session.user.role = token.role;
      return session;
    },
  },
});
