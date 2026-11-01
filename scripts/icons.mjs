// Renders the app icons from one SVG. Run: node scripts/icons.mjs (needs sharp: npm i -D sharp)
import sharp from "sharp";
import { mkdirSync } from "node:fs";
const svg = (pad) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#050506"/>
<g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
<rect x="40" y="40" width="432" height="432" rx="96" fill="#0e0e10" stroke="#232327" stroke-width="8"/>
<rect x="150" y="246" width="212" height="20" rx="10" fill="#a1a1aa"/>
<rect x="124" y="166" width="34" height="180" rx="12" fill="#a78bfa"/>
<rect x="354" y="166" width="34" height="180" rx="12" fill="#a78bfa"/>
<rect x="92" y="196" width="26" height="120" rx="10" fill="#a78bfa"/>
<rect x="394" y="196" width="26" height="120" rx="10" fill="#a78bfa"/>
</g></svg>`);
mkdirSync("public/icons", { recursive: true });
await sharp(svg(0)).resize(192).png().toFile("public/icons/icon-192.png");
await sharp(svg(0)).resize(512).png().toFile("public/icons/icon-512.png");
await sharp(svg(56)).resize(512).png().toFile("public/icons/maskable-512.png");
await sharp(svg(0)).resize(180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(svg(0)).resize(32).png().toFile("public/favicon.png");
console.log("icons written");
