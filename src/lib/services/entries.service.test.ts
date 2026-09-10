import { describe, it, expect } from "vitest";
import { entryInputSchema, deriveNoteFields, type EntryInput } from "./entries.service";

function baseInput(overrides: Partial<EntryInput> = {}): EntryInput {
  return {
    description: "Radili smo na temeljima.",
    materialOnSite: true,
    hasExtraPaidWork: false,
    hasProblems: false,
    needsOrder: false,
    ...overrides,
  };
}

describe("entryInputSchema", () => {
  it("accepts a minimal valid entry", () => {
    const result = entryInputSchema.safeParse(baseInput());
    expect(result.success).toBe(true);
  });

  it("rejects an empty description", () => {
    const result = entryInputSchema.safeParse(baseInput({ description: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects a description that's only whitespace (trimmed to empty)", () => {
    const result = entryInputSchema.safeParse(baseInput({ description: "   " }));
    expect(result.success).toBe(false);
  });

  it("rejects a description over the 2000-char limit", () => {
    const result = entryInputSchema.safeParse(baseInput({ description: "a".repeat(2001) }));
    expect(result.success).toBe(false);
  });

  it("accepts a description at exactly the 2000-char limit", () => {
    const result = entryInputSchema.safeParse(baseInput({ description: "a".repeat(2000) }));
    expect(result.success).toBe(true);
  });

  it("rejects a note over the 500-char limit", () => {
    const result = entryInputSchema.safeParse(
      baseInput({ needsOrder: true, orderNote: "a".repeat(501) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a non-boolean toggle value", () => {
    // @ts-expect-error deliberately wrong type, simulating a tampered request
    const result = entryInputSchema.safeParse(baseInput({ materialOnSite: "yes" }));
    expect(result.success).toBe(false);
  });
});

describe("deriveNoteFields", () => {
  it("keeps materialMissingNote only when materialOnSite is false", () => {
    expect(
      deriveNoteFields(
        baseInput({ materialOnSite: false, materialMissingNote: "Nema cementa" }),
      ),
    ).toMatchObject({ materialMissingNote: "Nema cementa" });

    expect(
      deriveNoteFields(
        baseInput({ materialOnSite: true, materialMissingNote: "Nema cementa" }),
      ),
    ).toMatchObject({ materialMissingNote: null });
  });

  it("discards extraPaidWorkNote when hasExtraPaidWork is false — the tamper case", () => {
    // A client could send note text without actually checking the box;
    // this is the rule that stops it from being stored as if it meant
    // something.
    const result = deriveNoteFields(
      baseInput({ hasExtraPaidWork: false, extraPaidWorkNote: "Sneaky note" }),
    );
    expect(result.extraPaidWorkNote).toBeNull();
  });

  it("keeps extraPaidWorkNote when hasExtraPaidWork is true", () => {
    const result = deriveNoteFields(
      baseInput({ hasExtraPaidWork: true, extraPaidWorkNote: "Fasada" }),
    );
    expect(result.extraPaidWorkNote).toBe("Fasada");
  });

  it("discards problemsNote when hasProblems is false", () => {
    const result = deriveNoteFields(baseInput({ hasProblems: false, problemsNote: "x" }));
    expect(result.problemsNote).toBeNull();
  });

  it("discards orderNote when needsOrder is false", () => {
    const result = deriveNoteFields(baseInput({ needsOrder: false, orderNote: "x" }));
    expect(result.orderNote).toBeNull();
  });

  it("defaults an undefined note to null even when its toggle is on", () => {
    const result = deriveNoteFields(baseInput({ needsOrder: true, orderNote: undefined }));
    expect(result.orderNote).toBeNull();
  });
});
