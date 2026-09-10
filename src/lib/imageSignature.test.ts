import { describe, it, expect } from "vitest";
import { matchesImageSignature } from "./imageSignature";

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const WEBP_HEADER = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.from([0x00, 0x00, 0x00, 0x00]), // file size field, not part of signature
  Buffer.from("WEBP", "ascii"),
]);
const HEIC_HEADER = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]), // box size
  Buffer.from("ftyp", "ascii"),
  Buffer.from("heic", "ascii"),
]);

describe("matchesImageSignature", () => {
  it("accepts a real JPEG signature", () => {
    expect(matchesImageSignature(JPEG_HEADER, "image/jpeg")).toBe(true);
  });

  it("accepts a real PNG signature", () => {
    expect(matchesImageSignature(PNG_HEADER, "image/png")).toBe(true);
  });

  it("accepts a real WEBP signature", () => {
    expect(matchesImageSignature(WEBP_HEADER, "image/webp")).toBe(true);
  });

  it("accepts a real HEIC signature", () => {
    expect(matchesImageSignature(HEIC_HEADER, "image/heic")).toBe(true);
  });

  it("accepts other known HEIF brand codes", () => {
    const heix = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x18]),
      Buffer.from("ftyp", "ascii"),
      Buffer.from("heix", "ascii"),
    ]);
    expect(matchesImageSignature(heix, "image/heic")).toBe(true);
  });

  it("rejects HTML content declared as a JPEG — the core spoofing case", () => {
    const fakeJpeg = Buffer.from("<html><script>alert(1)</script></html>", "ascii");
    expect(matchesImageSignature(fakeJpeg, "image/jpeg")).toBe(false);
  });

  it("rejects a PNG's bytes declared as a JPEG (cross-format mismatch)", () => {
    expect(matchesImageSignature(PNG_HEADER, "image/jpeg")).toBe(false);
  });

  it("rejects a JPEG's bytes declared as a PNG", () => {
    expect(matchesImageSignature(JPEG_HEADER, "image/png")).toBe(false);
  });

  it("rejects an unrecognized declared type outright", () => {
    expect(matchesImageSignature(JPEG_HEADER, "image/svg+xml")).toBe(false);
  });

  it("rejects empty/truncated buffers rather than throwing", () => {
    expect(matchesImageSignature(Buffer.alloc(0), "image/jpeg")).toBe(false);
    expect(matchesImageSignature(Buffer.from([0xff]), "image/png")).toBe(false);
  });

  it("rejects a WEBP-shaped RIFF container that isn't actually WEBP", () => {
    const riffAvi = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("AVI ", "ascii"),
    ]);
    expect(matchesImageSignature(riffAvi, "image/webp")).toBe(false);
  });
});
