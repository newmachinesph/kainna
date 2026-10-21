import { mkdir, stat } from "node:fs/promises";
import { dirname, extname } from "node:path";
import sharp from "sharp";

const WATERMARK = "https://facebook.com/kainnarecipes";

export async function optimizeFoodImage(input, output, maxWidth = 1200, thumbnail = false, watermark = false) {
  if (!Number.isInteger(maxWidth) || maxWidth < 320 || maxWidth > 2400) {
    throw new Error("max-width must be an integer between 320 and 2400");
  }

  const metadata = await sharp(input).metadata();
  const width = Math.min(metadata.width, maxWidth);
  const height = thumbnail ? Math.round(width * 3 / 4) : Math.round(metadata.height * width / metadata.width);
  const pipeline = sharp(input)
    .rotate()
    .resize(thumbnail ? { width, height, fit: "cover", position: "centre" } : { width, withoutEnlargement: true });

  if (watermark) {
    const fontSize = Math.max(12, Math.round(width * 0.018));
    const bottomMargin = Math.round(height * 0.035);
    const overlay = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="${height - bottomMargin}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="400" fill="white" fill-opacity="0.38">${WATERMARK}</text></svg>`);
    pipeline.composite([{ input: overlay, top: 0, left: 0 }]);
  }

  await mkdir(dirname(output), { recursive: true });
  const format = extname(output).toLowerCase();
  if (format === ".webp") {
    await pipeline.webp({ quality: 78, effort: 6 }).toFile(output);
  } else if (format === ".avif") {
    await pipeline.avif({ quality: 52, effort: 4 }).toFile(output);
  } else {
    throw new Error("Output must end in .webp or .avif");
  }

  return { width, height, bytes: (await stat(output)).size };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const [input, output, widthArg, mode] = process.argv.slice(2);
  if (!input || !output) {
    console.error("Usage: node scripts/optimize-food-image.mjs <input> <output.webp|output.avif> [max-width] [--thumbnail]");
    process.exit(1);
  }
  const result = await optimizeFoodImage(input, output, Number(widthArg ?? 1200), mode === "--thumbnail", process.argv.includes("--watermark"));
  console.log(`${output}: ${result.width}x${result.height}, ${result.bytes} bytes`);
}
