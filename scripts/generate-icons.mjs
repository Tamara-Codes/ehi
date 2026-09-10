// Generates placeholder PWA icons (brand-orange rounded square, "EB"
// initials) — a temporary stand-in until the client supplies real logo
// assets. iOS specifically requires a real PNG apple-touch-icon (SVG isn't
// accepted for the home-screen icon), which is why this exists at all
// rather than just referencing an SVG directly.
import sharp from "sharp";
import { mkdirSync } from "fs";

const BRAND_ORANGE = "#f2703c";

function svgIcon(size) {
  const radius = size * 0.22;
  const fontSize = size * 0.4;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND_ORANGE}"/>
      <text x="50%" y="53%" font-family="Arial, sans-serif" font-weight="700"
            font-size="${fontSize}" fill="white" text-anchor="middle" dominant-baseline="middle">EB</text>
    </svg>`;
}

mkdirSync("public/icons", { recursive: true });

const sizes = [
  { size: 192, file: "public/icons/icon-192.png" },
  { size: 512, file: "public/icons/icon-512.png" },
  { size: 180, file: "public/icons/apple-touch-icon.png" },
];

for (const { size, file } of sizes) {
  await sharp(Buffer.from(svgIcon(size))).png().toFile(file);
  console.log("Wrote", file);
}
