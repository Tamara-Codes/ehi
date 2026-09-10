import { vi } from "vitest";

// Importing service modules pulls in "@/auth" -> next-auth -> "next/server",
// which only resolves inside Next.js's own build system, not plain
// Vitest/Node. Our tests only exercise the pure, exported logic (Zod
// schemas, computeReminderDecision, deriveNoteFields) — none of which call
// auth() themselves — so a stub here is enough to let those modules import
// cleanly without pulling in the real (unresolvable-under-Vitest) next-auth
// internals.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));
