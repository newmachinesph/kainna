import type { Metadata } from "next";
import { Landing, type HomePick, type HomeSpotlight } from "@/components/Landing";
import type { FeaturedWeek } from "@/components/HomePlannerPreview";
import { absoluteUrl } from "@/lib/site";
import { jsonLd } from "@/lib/structured-data";
import { faqQuestions } from "@/lib/faq";

export const metadata: Metadata = { alternates: { canonical: "/" } };
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
    fetch(`${base}/v1/catalog?limit=4&recipes_only=true&rotate=daily`, { cache: "no-store" }),
    fetch(`${base}/health`, { cache: "no-store" }),
    fetch(`${base}/v1/featured-week`, { cache: "no-store" }),
    ...categoryDetails.map(({ name }) => fetch(`${base}/v1/catalog?limit=1&rotate=weekly&category=${encodeURIComponent(name)}`, { cache: "no-store" })),
  ]);
  if (![catalogResponse, healthResponse, featuredResponse, ...categoryResponses].every((response) => response.ok)) throw new Error("Food catalog unavailable");
  const catalog = await catalogResponse.json() as { items: HomePick[]; total: number };
  const health = await healthResponse.json() as { catalog_images: number; ulam_recipes: number; merienda_recipes: number; catalog_recipes: number };
  const featured = await featuredResponse.json() as FeaturedWeek;
  const categoryResults = await Promise.all(categoryResponses.map((response) => response.json() as Promise<{ items: HomePick[]; total: number }>));
  // The spotlight is today's dish from the featured week, so it turns over every day in Manila.
  const today = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "short" }).format(new Date()));
  const spotlight = featured.days.find(({ day }) => day === today)?.recipe as HomeSpotlight | undefined;
  if (!catalog.items[0] || !spotlight || categoryResults.some((result) => !result.items[0])) throw new Error("Featured food unavailable");
  const categories = categoryDetails.map((detail, index) => ({ ...detail, count: categoryResults[index].total, image: categoryResults[index].items[0].image }));
  const organization = { "@context": "https://schema.org", "@type": "Organization", "@id": `${absoluteUrl("/")}#organization`, name: "Kain Na!", url: absoluteUrl("/"), logo: absoluteUrl("/brand/kain-na-logo.svg"), description: "Filipino home recipes with ingredients and steps, estimated peso costs per serving, and weekly ulam plans for households cooking on ₱200, ₱300 or ₱500 a day.", areaServed: { "@type": "Country", name: "Philippines" }, knowsLanguage: ["en", "tl"], sameAs: ["https://www.facebook.com/kainnarecipes"] };
  const website = { "@context": "https://schema.org", "@type": "WebSite", "@id": `${absoluteUrl("/")}#website`, name: "Kain Na!", url: absoluteUrl("/"), inLanguage: "en-PH", publisher: { "@id": `${absoluteUrl("/")}#organization` }, potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/recipes")}?q={search_term_string}` }, "query-input": "required name=search_term_string" } };
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqQuestions(health.catalog_images, catalog.total).map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(website) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} /><Landing featured={featured} picks={catalog.items} categories={categories} spotlight={spotlight} catalogCount={health.catalog_images} recipeCount={catalog.total} /></>;
}
