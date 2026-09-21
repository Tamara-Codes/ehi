// Same defense-in-depth idea as imageSignature.ts, for video containers:
// checks the leading bytes actually match the declared MIME type instead of
// trusting File.type alone.
export function matchesVideoSignature(buffer: Buffer, declaredType: string): boolean {
  switch (declaredType) {
    case "video/mp4":
    case "video/quicktime":
    case "video/x-m4v": {
      // ISOBMFF "ftyp" box, same container family as HEIC images: 4-byte
      // size, then "ftyp", then a brand code.
      return buffer.length >= 8 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
    }

    case "video/webm": {
      // EBML header, shared by WebM and Matroska.
      return (
        buffer.length >= 4 &&
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3
      );
    }

    default:
      return false;
  }
}
