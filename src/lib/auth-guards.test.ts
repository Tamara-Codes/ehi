import { describe, it, expect, beforeAll, afterAll, type Mock } from "vitest";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "./auth-guards";

// Integration test against the real dev database (not mocked) — this is
// specifically to prove the fix for "a deactivated worker's still-valid
// session cookie keeps working" actually works, not just that the code
// reads correctly. auth() itself is globally mocked (vitest.setup.ts,
// since importing the real one pulls in next/server, unresolvable under
// plain Vitest) — each test controls what session it returns.
//
// Cast through `Mock` rather than `vi.mocked(auth)`: Auth.js v5 beta's
// `auth` export is overloaded (route handler / proxy / plain call), and TS
// picks an unrelated overload (NextMiddleware) when inferring
// mockResolvedValue's expected argument type — the same "internally
// inconsistent beta types" issue documented in src/auth.ts.
const mockedAuth = auth as unknown as Mock;

describe("requireUser (integration, real DB)", () => {
  let testUserId: number;

  beforeAll(async () => {
    const [row] = await db
      .insert(users)
      .values({
        email: `auth-guards-test-${Date.now()}@example.com`,
        name: "Auth Guards Test User",
        role: "worker",
        status: "active",
      })
      .returning();
    testUserId = row.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("allows an active user through", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: testUserId, role: "worker" },
    });

    const session = await requireUser();
    expect(session.user.id).toBe(testUserId);
  });

  it("rejects a deactivated user even with a technically-valid session — the core fix", async () => {
    await db.update(users).set({ status: "inactive" }).where(eq(users.id, testUserId));
    mockedAuth.mockResolvedValue({
      user: { id: testUserId, role: "worker" },
    });

    await expect(requireUser()).rejects.toThrow("Account is not active");

    // restore for any later test in this file
    await db.update(users).set({ status: "active" }).where(eq(users.id, testUserId));
  });

  it("rejects an 'invited' (never-logged-in) user", async () => {
    await db.update(users).set({ status: "invited" }).where(eq(users.id, testUserId));
    mockedAuth.mockResolvedValue({
      user: { id: testUserId, role: "worker" },
    });

    await expect(requireUser()).rejects.toThrow("Account is not active");

    await db.update(users).set({ status: "active" }).where(eq(users.id, testUserId));
  });

  it("rejects when there's no session at all", async () => {
    mockedAuth.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("Not authenticated");
  });

  it("rejects a session whose user id no longer exists in the DB", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: -999999, role: "worker" },
    });
    await expect(requireUser()).rejects.toThrow("Account is not active");
  });
});
