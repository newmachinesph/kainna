import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { CATEGORY_SLUGS, catalogSlug } from "@/lib/catalog-urls";

export const dynamic = "force-dynamic";

type SeoIndex = { catalog_ids: string[]; ulam_slugs: string[]; merienda_slugs: string[] };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${base}/v1/seo-index`, { cache: "no-store" });
  if (!response.ok) throw new Error("Recipe sitemap unavailable");
  const index = await response.json() as SeoIndex;
  const staticPaths = ["/", "/recipes", "/merienda", "/budget", ...Object.values(CATEGORY_SLUGS).map((slug) => `/recipes/${slug}`)];
  const recipePaths = [
    ...index.ulam_slugs.map((slug) => `/recipes/${encodeURIComponent(slug)}`),
    ...index.merienda_slugs.map((slug) => `/merienda/${encodeURIComponent(slug)}`),
    ...index.catalog_ids.map((id) => `/recipes/${encodeURIComponent(catalogSlug(id))}`),
  ];
  return [...staticPaths, ...recipePaths].map((path) => ({ url: absoluteUrl(path) }));
}
