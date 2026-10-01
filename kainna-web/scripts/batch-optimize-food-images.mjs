import { readdir, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { optimizeFoodImage } from "./optimize-food-image.mjs";

const args = process.argv.slice(2);
const watermark = args.includes("--watermark");
const [sourceDir = "public/food", targetDir = watermark ? "../../preview/optimized-food-watermark-v1" : "../../preview/optimized-food-clean-v3"] = args.filter((arg) => arg !== "--watermark");
const implementationModified = (await stat(new URL("./optimize-food-image.mjs", import.meta.url))).mtimeMs;
const files = (await readdir(sourceDir)).filter((name) => name.toLowerCase().endsWith(".webp")).sort();
const variants = [
  { folder: "full", width: 1200, thumbnail: false, extension: ".webp" },
  { folder: "full", width: 1200, thumbnail: false, extension: ".avif" },
  { folder: "thumbnail", width: 640, thumbnail: true, extension: ".webp" },
  { folder: "thumbnail", width: 640, thumbnail: true, extension: ".avif" },
];
const totals = Object.fromEntries(variants.map(({ folder, extension }) => [`${folder}${extension}`, { count: 0, bytes: 0 }]));
let next = 0;
let completed = 0;
const errors = [];

async function worker() {
  while (next < files.length) {
    const name = files[next++];
    const input = join(sourceDir, name);
    const stem = basename(name, ".webp");
    try {
      const sourceModified = (await stat(input)).mtimeMs;
      for (const variant of variants) {
        const output = join(targetDir, variant.folder, `${stem}${variant.extension}`);
        const existing = await stat(output).catch(() => null);
        const result = existing?.size && existing.mtimeMs >= Math.max(sourceModified, implementationModified)
          ? { bytes: existing.size }
          : await optimizeFoodImage(input, output, variant.width, variant.thumbnail, watermark);
        const total = totals[`${variant.folder}${variant.extension}`];
        total.count++;
        total.bytes += result.bytes;
      }
    } catch (error) {
      errors.push({ name, error: String(error) });
      console.error(`${name}: ${error}`);
    }
    completed++;
    if (completed % 100 === 0 || completed === files.length) {
      console.log(`Processed ${completed}/${files.length} source images`);
    }
  }
}

await Promise.all(Array.from({ length: 3 }, () => worker()));
const report = { sourceImages: files.length, watermark: watermark ? "https://facebook.com/kainnarecipes" : null, variants: totals, errors };
await writeFile(join(targetDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (errors.length) process.exitCode = 1;
