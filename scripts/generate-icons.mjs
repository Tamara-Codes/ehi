// Generates the PWA icon set from the client's real logo (a tall
// shield/lightning-bolt mark, not natively square) — composites it onto a
// square canvas with a little breathing room, then outputs each size/
// background combination the app actually needs.
import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";

const SOURCE = fileURLToPath(new URL("../assets/ehi-logo-source.png", import.meta.url));

mkdirSync("public/icons", { recursive: true });

// Building each size from scratch (rather than compositing once at high-res
// and downscaling afterward) sidesteps a sharp quirk where a queued
// composite gets validated against the base's *post-resize* dimensions when
// resize is chained after composite on a cloned pipeline.
async function squareIcon({ size, background, file }) {
  const inner = Math.round(size * 0.82);
  const logo = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(file);

  console.log("Wrote", file);
}

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const white = { r: 255, g: 255, b: 255, alpha: 1 };

// Manifest icons (Android, generic): transparent background — the logo's
// own shield shape already reads fine without a background fill.
await squareIcon({ size: 192, background: transparent, file: "public/icons/icon-192.png" });
await squareIcon({ size: 512, background: transparent, file: "public/icons/icon-512.png" });

// iOS apple-touch-icon specifically: Safari renders transparent pixels as
// black on the home screen (a long-standing iOS quirk, not a bug in this
// script) — flatten onto opaque white instead.
await squareIcon({ size: 180, background: white, file: "public/icons/apple-touch-icon.png" });
