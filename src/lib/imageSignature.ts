// Verifies a file's actual bytes match its declared MIME type, rather than
// trusting the client-supplied Content-Type/File.type alone — a browser's
// file picker reports these accurately, but a hand-crafted request to our
// Server Action wouldn't be constrained to actually match. This is a
// defense-in-depth check, not a full image parser: it only looks at the
// handful of leading "magic bytes" each format is guaranteed to start with.
export function matchesImageSignature(buffer: Buffer, declaredType: string): boolean {
  switch (declaredType) {
    case "image/jpeg":
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    case "image/png":
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );

    case "image/webp":
      // "RIFF"...."WEBP" — bytes 4-7 are a file-size field, not signature.
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );

    case "image/heic": {
      // ISOBMFF "ftyp" box: 4-byte size, then "ftyp", then a brand code
      // (heic/heix/hevc/hevx/mif1/msf1 cover the common HEIC/HEIF variants).
      if (buffer.length < 12 || buffer.subarray(4, 8).toString("ascii") !== "ftyp") {
        return false;
      }
      const brand = buffer.subarray(8, 12).toString("ascii");
      return ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand);
    }

    default:
      return false;
  }
}
