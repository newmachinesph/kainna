import type { MetadataRoute } from "next";
import { absoluteUrl, publicImageUrl } from "@/lib/site";
import { CATEGORY_SLUGS, catalogSlug } from "@/lib/catalog-urls";
import { BUDGET_PAGE_SIZES, TIERS } from "@/lib/config";

export const dynamic = "force-dynamic";

type SeoIndex = { catalog_ids: string[]; ulam_slugs: string[]; merienda_slugs: string[] };
type SeoCatalogItem = { id: string; image?: string | null; recipe_slug?: string | null; merienda_slug?: string | null };
type Entry = MetadataRoute.Sitemap[number];

async function catalogImages(base: string): Promise<Map<string, string>> {
  const response = await fetch(`${base}/v1/seo-catalog`, { cache: "no-store" });
  if (!response.ok) throw new Error("Catalog images unavailable");
  const { items } = await response.json() as { items: SeoCatalogItem[] };
  const images = new Map<string, string>();
  for (const item of items) {
    // Next writes sitemap XML without escaping, so a query-string ampersand would break the file.
    const image = publicImageUrl(item.image)?.replace(/&/g, "&amp;");
    if (!image) continue;
    images.set(`catalog:${item.id}`, image);
    if (item.recipe_slug && !images.has(`ulam:${item.recipe_slug}`)) images.set(`ulam:${item.recipe_slug}`, image);
    if (item.merienda_slug && !images.has(`merienda:${item.merienda_slug}`)) images.set(`merienda:${item.merienda_slug}`, image);
  }
  return images;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${base}/v1/seo-index`, { cache: "no-store" });
  if (!response.ok) throw new Error("Recipe sitemap unavailable");
  const index = await response.json() as SeoIndex;
  // Images are a bonus for the sitemap, so a catalog hiccup should not take the whole sitemap down.
  const images = await catalogImages(base).catch(() => new Map<string, string>());
  const page = (path: string, changeFrequency: Entry["changeFrequency"], priority: number, image?: string): Entry =>
    ({ url: absoluteUrl(path), changeFrequency, priority, ...(image ? { images: [image] } : {}) });
  return [
    page("/", "daily", 1),
    page("/recipes", "weekly", 0.9),
    ...Object.values(CATEGORY_SLUGS).map((slug) => page(`/recipes/${slug}`, "weekly", 0.8)),
    page("/recipes/a-z", "weekly", 0.8),
    page("/merienda", "monthly", 0.8),
    page("/budget", "weekly", 0.8),
    ...TIERS.flatMap((tier) => BUDGET_PAGE_SIZES.map((size) => page(`/budget/${tier.daily_php}/${size}`, "weekly", 0.7))),
    page("/about", "yearly", 0.5),
    ...index.ulam_slugs.map((slug) => page(`/recipes/${encodeURIComponent(slug)}`, "monthly", 0.7, images.get(`ulam:${slug}`))),
    ...index.merienda_slugs.map((slug) => page(`/merienda/${encodeURIComponent(slug)}`, "monthly", 0.6, images.get(`merienda:${slug}`))),
    ...index.catalog_ids.map((id) => page(`/recipes/${encodeURIComponent(catalogSlug(id))}`, "monthly", 0.6, images.get(`catalog:${id}`))),
  ];
}
