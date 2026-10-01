import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const web = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(web, "..", "..", "preview", "kain-na-linen-source.png");
const output = join(web, "public", "brand", "linen-paper-v1.webp");
await sharp(source).resize({ width: 1280 }).webp({ quality: 76, effort: 6 }).toFile(output);
console.log(output);
