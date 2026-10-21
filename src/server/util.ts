import { createHash } from "node:crypto";

const MEDIA_BASE = (process.env.S3_PUBLIC_BASE ?? "https://cdn.kainna.ph/watermark-v1/full").replace(/\/$/, "");
const MEDIA_VERSION = process.env.SALO_MEDIA_VERSION ?? "watermark-v1";

export type Json = Record<string, unknown>;

/** Keep stored PHP estimates in five-peso increments. */
export function roundPrice(amount: number): number {
  return Math.max(5, Math.floor(amount / 5 + 0.5) * 5);
}

export function withMedia<T extends Json>(item: T): T {
  const image = item.image;
  if (typeof image === "string" && image.startsWith("/food/")) return { ...item, image: `${MEDIA_BASE}/${image.split("/").pop()}?v=${MEDIA_VERSION}` };
  return item;
}

export function parseJson<T = Json>(value: unknown): T {
  return JSON.parse(String(value)) as T;
}

export const nowIso = () => new Date().toISOString();

export function tokenDigest(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Today's date in Manila as YYYY-MM-DD. */
export function manilaDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function weekMonday(now = new Date()): string {
  const today = new Date(`${manilaDate(now)}T00:00:00Z`);
  today.setUTCDate(today.getUTCDate() - (today.getUTCDay() + 6) % 7);
  return today.toISOString().slice(0, 10);
}

/** Deterministic PRNG (mulberry32) seeded from a string, so picks stay stable for a given seed. */
export function seededRandom(seed: string): () => number {
  let state = createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/** Seeded by the Manila day or week, so picks change on schedule but stay stable in between. */
export function rotationRandom(period: "daily" | "weekly", scope: string): () => number {
  return seededRandom(`${scope}:${period === "weekly" ? weekMonday() : manilaDate()}`);
}
