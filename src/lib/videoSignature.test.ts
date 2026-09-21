import { describe, it, expect } from "vitest";
import { matchesVideoSignature } from "./videoSignature";

const MP4_HEADER = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]), // box size
  Buffer.from("ftyp", "ascii"),
  Buffer.from("isom", "ascii"),
]);
const WEBM_HEADER = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00]);

describe("matchesVideoSignature", () => {
  it("accepts a real MP4 signature", () => {
    expect(matchesVideoSignature(MP4_HEADER, "video/mp4")).toBe(true);
  });

  it("accepts an MP4-shaped ftyp box declared as quicktime/m4v too", () => {
    expect(matchesVideoSignature(MP4_HEADER, "video/quicktime")).toBe(true);
    expect(matchesVideoSignature(MP4_HEADER, "video/x-m4v")).toBe(true);
  });

  it("accepts a real WebM signature", () => {
    expect(matchesVideoSignature(WEBM_HEADER, "video/webm")).toBe(true);
  });

  it("rejects HTML content declared as an MP4 — the core spoofing case", () => {
    const fakeMp4 = Buffer.from("<html><script>alert(1)</script></html>", "ascii");
    expect(matchesVideoSignature(fakeMp4, "video/mp4")).toBe(false);
  });

  it("rejects a WebM's bytes declared as an MP4 (cross-format mismatch)", () => {
    expect(matchesVideoSignature(WEBM_HEADER, "video/mp4")).toBe(false);
  });

  it("rejects an MP4's bytes declared as WebM", () => {
    expect(matchesVideoSignature(MP4_HEADER, "video/webm")).toBe(false);
  });

  it("rejects an unrecognized declared type outright", () => {
    expect(matchesVideoSignature(MP4_HEADER, "video/x-matroska")).toBe(false);
  });

  it("rejects empty/truncated buffers rather than throwing", () => {
    expect(matchesVideoSignature(Buffer.alloc(0), "video/mp4")).toBe(false);
    expect(matchesVideoSignature(Buffer.from([0x1a]), "video/webm")).toBe(false);
  });
});
