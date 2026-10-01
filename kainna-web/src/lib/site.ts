export const siteUrl = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const isPublicSite = !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(siteUrl);

export function absoluteUrl(path: string): string {
  return new URL(path, `${siteUrl}/`).toString();
}

/** Catalog photos are also served by Next.js, giving crawlers a public URL. */
export function publicImageUrl(image?: string | null): string | undefined {
  if (!image) return undefined;
  try {
    const source = new URL(image, siteUrl);
    if (source.protocol === "https:" && !["localhost", "127.0.0.1"].includes(source.hostname)) {
      return source.toString();
    }
    const filename = decodeURIComponent(source.pathname.split("/").at(-1) || "");
    return filename ? absoluteUrl(`/food/${encodeURIComponent(filename)}`) : undefined;
  } catch {
    return undefined;
  }
}
