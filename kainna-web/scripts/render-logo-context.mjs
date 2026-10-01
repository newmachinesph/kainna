import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const web = dirname(dirname(fileURLToPath(import.meta.url)));
const mark = await readFile(join(web, "public/brand/kain-na-mark-footer.svg"));
const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="850" height="340">
  <rect width="850" height="340" fill="#0f241b"/>
  <line x1="0" y1="170" x2="850" y2="170" stroke="#f7f4eb" stroke-opacity="0.2"/>
  <circle cx="58" cy="102" r="18" fill="#20372e"/>
  <circle cx="67" cy="278" r="27" fill="#20372e"/>
  <text x="40" y="42" font-family="Arial" font-size="17" fill="#f7f4eb">Navbar · actual size</text>
  <text x="83" y="113" font-family="Arial" font-size="27" font-weight="800" fill="#f7f4eb">Kain<tspan fill="#efc448"> Na!</tspan></text>
  <text x="40" y="211" font-family="Arial" font-size="17" fill="#f7f4eb">Footer · actual size</text>
  <text x="104" y="293" font-family="Arial" font-size="40" font-weight="800" fill="#f7f4eb">Kain<tspan fill="#efc448"> Na!</tspan></text>
</svg>`);
await sharp(background).composite([
  { input: await sharp(mark).resize(36, 36).png().toBuffer(), left: 40, top: 84 },
  { input: await sharp(mark).resize(54, 54).png().toBuffer(), left: 40, top: 251 },
]).png().toFile(join(web, "..", "..", "preview", "supplied-logo-context.png"));
