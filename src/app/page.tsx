import { Landing, type HomePick, type HomeSpotlight } from "@/components/Landing";
import type { FeaturedWeek } from "@/components/HomePlannerPreview";
import { absoluteUrl } from "@/lib/site";
import { jsonLd } from "@/lib/structured-data";
import { faqQuestions } from "@/lib/faq";
import { featuredWeek, health as getHealth, listCatalog } from "@/server/catalog";

export const dynamic = "force-dynamic";

const categoryDetails = [
  { name: "Chicken", caption: "Weeknight comfort" },
  { name: "Pork & beef", caption: "Slow-cooked favorites" },
  { name: "Seafood", caption: "From the coast" },
  { name: "Vegetables", caption: "Greens worth sharing" },
  { name: "Rice & noodles", caption: "For the whole table" },
  { name: "Desserts", caption: "A sweet finish" },
];

type CatalogPage = { items: HomePick[]; total: number };

export default async function HomePage() {
  const [catalog, health, featured, ...categoryResults] = await Promise.all([
    listCatalog({ limit: 4, recipesOnly: true, rotate: "daily" }) as unknown as Promise<CatalogPage>,
    getHealth(),
    featuredWeek() as unknown as Promise<FeaturedWeek>,
    ...categoryDetails.map(({ name }) => listCatalog({ limit: 1, rotate: "weekly", category: name }) as unknown as Promise<CatalogPage>),
  ]);
  // The spotlight is today's dish from the featured week, so it turns over every day in Manila.
  const today = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "short" }).format(new Date()));
  const spotlight = featured.days.find(({ day }) => day === today)?.recipe as HomeSpotlight | undefined;
  if (!catalog.items[0] || !spotlight || categoryResults.some((result) => !result.items[0])) throw new Error("Featured food unavailable");
  const categories = categoryDetails.map((detail, index) => ({ ...detail, count: categoryResults[index].total, image: categoryResults[index].items[0].image }));
  const organization = { "@context": "https://schema.org", "@type": "Organization", "@id": `${absoluteUrl("/")}#organization`, name: "Kain Na!", url: absoluteUrl("/"), logo: absoluteUrl("/brand/kain-na-logo.svg"), sameAs: ["https://www.facebook.com/kainnarecipes"] };
  const website = { "@context": "https://schema.org", "@type": "WebSite", "@id": `${absoluteUrl("/")}#website`, name: "Kain Na!", url: absoluteUrl("/"), inLanguage: "en-PH", publisher: { "@id": `${absoluteUrl("/")}#organization` }, potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/recipes")}?q={search_term_string}` }, "query-input": "required name=search_term_string" } };
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqQuestions(health.catalog_images, catalog.total).map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(website) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faq) }} /><Landing featured={featured} picks={catalog.items} categories={categories} spotlight={spotlight} catalogCount={health.catalog_images} recipeCount={catalog.total} /></>;
}
