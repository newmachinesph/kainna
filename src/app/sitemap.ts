import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { CATEGORY_SLUGS, catalogSlug } from "@/lib/catalog-urls";
import { seoIndex } from "@/server/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = await seoIndex();
  const staticPaths = ["/", "/recipes", "/merienda", "/budget", ...Object.values(CATEGORY_SLUGS).map((slug) => `/recipes/${slug}`)];
  const recipePaths = [
    ...index.ulam_slugs.map((slug) => `/recipes/${encodeURIComponent(slug)}`),
    ...index.merienda_slugs.map((slug) => `/merienda/${encodeURIComponent(slug)}`),
    ...index.catalog_ids.map((id) => `/recipes/${encodeURIComponent(catalogSlug(id))}`),
  ];
  return [...staticPaths, ...recipePaths].map((path) => ({ url: absoluteUrl(path) }));
}
