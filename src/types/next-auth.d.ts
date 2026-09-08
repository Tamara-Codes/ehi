// Auth.js's built-in types don't know about our custom fields (id, role) —
// this file extends its types so TypeScript understands
// `session.user.role` everywhere else in the app, instead of erroring.
//
// Note: "next-auth" only re-exports Session from "@auth/core/types" (a
// type-only re-export), so augmenting "next-auth" itself doesn't merge into
// the real interface — we have to augment "@auth/core/types" directly.
//
// We define the full "user" shape here rather than intersecting with
// Auth.js's DefaultSession["user"], because its base User type already
// declares `id?: string` — intersecting that with our `id: number` collapses
// to the `never` type (string & number is impossible), not a wider type.
declare module "@auth/core/types" {
  interface Session {
    user: {
      id: number;
      role: "admin" | "worker";
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: number;
    role?: "admin" | "worker";
  }
}
