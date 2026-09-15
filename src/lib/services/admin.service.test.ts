import { describe, it, expect } from "vitest";
import { emailSchema, nameSchema, timeSchema, daysSchema, messageSchema } from "./admin.service";

describe("emailSchema", () => {
  it("accepts a normal Gmail address", () => {
    expect(emailSchema.safeParse("marko@gmail.com").success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const result = emailSchema.safeParse("  marko@gmail.com  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("marko@gmail.com");
  });

  it("rejects a malformed address", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("nameSchema", () => {
  it("accepts a normal name", () => {
    expect(nameSchema.safeParse("Marko Kovač").success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(nameSchema.safeParse("").success).toBe(false);
  });

  it("rejects a whitespace-only name (trimmed to empty)", () => {
    expect(nameSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects a name over 200 characters", () => {
    expect(nameSchema.safeParse("a".repeat(201)).success).toBe(false);
  });
});

describe("timeSchema (HH:MM)", () => {
  it("accepts valid times across the full range", () => {
    for (const time of ["00:00", "09:05", "16:30", "23:59"]) {
      expect(timeSchema.safeParse(time).success, time).toBe(true);
    }
  });

  it("rejects an hour of 24 or above", () => {
    expect(timeSchema.safeParse("24:00").success).toBe(false);
  });

  it("rejects a minute of 60 or above", () => {
    expect(timeSchema.safeParse("12:60").success).toBe(false);
  });

  it("rejects a single-digit hour without a leading zero", () => {
    expect(timeSchema.safeParse("9:05").success).toBe(false);
  });

  it("rejects garbage input", () => {
    expect(timeSchema.safeParse("not-a-time").success).toBe(false);
    expect(timeSchema.safeParse("").success).toBe(false);
  });
});

describe("daysSchema", () => {
  it("accepts a valid subset of weekdays", () => {
    expect(daysSchema.safeParse([1, 2, 3, 4, 5]).success).toBe(true);
  });

  it("accepts all seven days including the boundary values 0 and 6", () => {
    expect(daysSchema.safeParse([0, 1, 2, 3, 4, 5, 6]).success).toBe(true);
  });

  it("rejects an empty array — must pick at least one day", () => {
    expect(daysSchema.safeParse([]).success).toBe(false);
  });

  it("rejects an out-of-range day value", () => {
    expect(daysSchema.safeParse([7]).success).toBe(false);
    expect(daysSchema.safeParse([-1]).success).toBe(false);
  });

  it("rejects non-integer values", () => {
    expect(daysSchema.safeParse([1.5]).success).toBe(false);
  });
});

describe("messageSchema", () => {
  it("accepts a normal reminder message", () => {
    expect(messageSchema.safeParse("Ne zaboravite upisati što ste danas radili.").success).toBe(
      true,
    );
  });

  it("trims surrounding whitespace", () => {
    const result = messageSchema.safeParse("  Poruka  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("Poruka");
  });

  it("rejects an empty message", () => {
    expect(messageSchema.safeParse("").success).toBe(false);
  });

  it("rejects a whitespace-only message (trimmed to empty)", () => {
    expect(messageSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects a message over 300 characters", () => {
    expect(messageSchema.safeParse("a".repeat(301)).success).toBe(false);
  });

  it("accepts a message at exactly the 300-char limit", () => {
    expect(messageSchema.safeParse("a".repeat(300)).success).toBe(true);
  });
});
