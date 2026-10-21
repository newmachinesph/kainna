import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(root, "public");
const appDir = join(root, "src", "app");
const mark = await readFile(join(publicDir, "brand", "kain-na-mark.svg"));

for (const [size, name] of [[32, "favicon-32.png"], [180, "icons/apple-touch-icon.png"], [192, "icons/icon-192.png"], [512, "icons/icon-512.png"]]) {
  await sharp(mark).resize(size, size).png().toFile(join(publicDir, name));
}
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0f241b" } })
  .composite([{ input: await sharp(mark).resize(370, 370).png().toBuffer(), left: 71, top: 71 }])
  .png().toFile(join(publicDir, "icons", "icon-maskable-512.png"));

async function tile(filename, width, height, radius) {
  const photo = await sharp(join(publicDir, "food", filename)).resize(width, height, { fit: "cover", position: "centre" }).png().toBuffer();
  const mask = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="white"/></svg>`);
  return sharp(photo).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

const card = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0f241b"/>
  <circle cx="1133" cy="49" r="190" fill="#29483a"/>
  <circle cx="1117" cy="598" r="260" fill="#29483a"/>
  <text x="174" y="118" fill="#f7f4eb" font-family="Arial,sans-serif" font-size="51" font-weight="800" letter-spacing="-2">Kain<tspan dx="11" fill="#efc448">Na!</tspan></text>
  <text x="75" y="252" fill="#efc448" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="4">LUTONG BAHAY, MADE EASIER</text>
  <text x="72" y="343" fill="#f7f4eb" font-family="Arial,sans-serif" font-size="67" font-weight="800" letter-spacing="-3">More Filipino food</text>
  <text x="72" y="419" fill="#f7f4eb" font-family="Arial,sans-serif" font-size="67" font-weight="800" letter-spacing="-3">on the table.</text>
  <text x="76" y="493" fill="#d8e0d7" font-family="Arial,sans-serif" font-size="25">Recipes  •  weekly plans  •  palengke lists</text>
  <rect x="76" y="549" width="91" height="6" rx="3" fill="#efc448"/>
</svg>`);
const collage = [
  { input: await tile("phfood_26aee4e9e0c1__chicken-adobo.webp", 286, 267, 19), left: 873, top: 39 },
  { input: await tile("phfood_3f464401f439__sinigang-na-baboy.webp", 252, 263, 19), left: 715, top: 330 },
  { input: await tile("phfood_1b3b8144afd6__fish-sarciado.webp", 176, 263, 19), left: 983, top: 330 },
];
const image = await sharp(card).composite([
  { input: await sharp(mark).resize(78, 78).png().toBuffer(), left: 74, top: 51 },
  ...collage,
]).png().toBuffer();
await sharp(image).toFile(join(appDir, "opengraph-image.png"));
await sharp(image).toFile(join(appDir, "twitter-image.png"));
console.log("Kain Na! brand images updated");
