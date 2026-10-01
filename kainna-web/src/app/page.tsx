import { Landing, type HomePick, type HomeSpotlight } from "@/components/Landing";
import type { FeaturedWeek } from "@/components/HomePlannerPreview";
import { absoluteUrl } from "@/lib/site";
import { jsonLd } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

const categoryDetails = [
  { name: "Chicken", caption: "Weeknight comfort" },
  { name: "Pork & beef", caption: "Slow-cooked favorites" },
  { name: "Seafood", caption: "From the coast" },
  { name: "Vegetables", caption: "Greens worth sharing" },
  { name: "Rice & noodles", caption: "For the whole table" },
  { name: "Desserts", caption: "A sweet finish" },
];

export default async function HomePage() {
  const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
  const [catalogResponse, healthResponse, featuredResponse, ...categoryResponses] = await Promise.all([
    fetch(`${base}/v1/catalog?limit=4&recipes_only=true`, { cache: "no-store" }),
    fetch(`${base}/health`, { cache: "no-store" }),
    fetch(`${base}/v1/featured-week`, { cache: "no-store" }),
    ...categoryDetails.map(({ name }) => fetch(`${base}/v1/catalog?limit=1&category=${encodeURIComponent(name)}`, { cache: "no-store" })),
  ]);
  if (![catalogResponse, healthResponse, ...categoryResponses].every((response) => response.ok)) throw new Error("Food catalog unavailable");
  const catalog = await catalogResponse.json() as { items: HomePick[]; total: number };
  const health = await healthResponse.json() as { catalog_images: number; ulam_recipes: number; merienda_recipes: number; catalog_recipes: number };
  const featured = await featuredResponse.json() as FeaturedWeek;
  const categoryResults = await Promise.all(categoryResponses.map((response) => response.json() as Promise<{ items: HomePick[]; total: number }>));
  const spotlightSlug = catalog.items.find(item => item.recipe_slug)?.recipe_slug;
  if (!catalog.items[0] || !spotlightSlug || categoryResults.some((result) => !result.items[0])) throw new Error("Featured food unavailable");
  const spotlightResponse = await fetch(`${base}/v1/recipes/${encodeURIComponent(spotlightSlug)}`, { cache: "no-store" });
  if (!spotlightResponse.ok) throw new Error("Featured recipe unavailable");
  const spotlight = await spotlightResponse.json() as HomeSpotlight;
  const categories = categoryDetails.map((detail, index) => ({ ...detail, count: categoryResults[index].total, image: categoryResults[index].items[0].image }));
  const organization = { "@context": "https://schema.org", "@type": "Organization", "@id": `${absoluteUrl("/")}#organization`, name: "Kain Na!", url: absoluteUrl("/"), logo: absoluteUrl("/brand/kain-na-logo.svg") };
  const website = { "@context": "https://schema.org", "@type": "WebSite", "@id": `${absoluteUrl("/")}#website`, name: "Kain Na!", url: absoluteUrl("/"), inLanguage: "en-PH", publisher: { "@id": `${absoluteUrl("/")}#organization` } };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(website) }} /><Landing featured={featured} picks={catalog.items} categories={categories} spotlight={spotlight} catalogCount={health.catalog_images} recipeCount={catalog.total} /></>;
}
