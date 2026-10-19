import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { DishDetail } from "@/components/DishDetail";
import { CatalogRecipe, formatDuration, loadCatalogItem } from "@/components/CatalogRecipe";
import { Discover, type CatalogResult } from "@/components/Discover";
import type { Dish } from "@/lib/types";
import { absoluteUrl } from "@/lib/site";
import { categoryFromSlug, categoryHref, foodHref } from "@/lib/catalog-urls";
import { recipeSeoDescription, recipeSeoTitle, recipeSocialImage } from "@/lib/recipe-seo";
import { jsonLd, recipeBreadcrumbs, ulamRecipeSchema } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

const API = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

async function loadDish(slug: string): Promise<Dish | null> {
  const response = await fetch(`${API}/v1/recipes/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Recipes unavailable");
  return response.json() as Promise<Dish>;
}

export const loadCategoryPage = cache(async (category: string, page = 1, query = ""): Promise<CatalogResult> => {
  const response = await fetch(`${API}/v1/catalog?limit=24&page=${page}&category=${encodeURIComponent(category)}&q=${encodeURIComponent(query)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Food catalog unavailable");
  return response.json() as Promise<CatalogResult>;
});

/** Shown above the grid on each category page. */
const CATEGORY_INTROS: Record<string, string> = {
  "Chicken": "Chicken is the ulam most Filipino homes cook on a weeknight. Start with adobo braised in soy sauce and vinegar, or tinola with green papaya and dahon ng sili when it rains.",
  "Pork & beef": "Pork and beef take longer and cost more, so many families save them for Sunday or a fiesta. Think sinigang na baboy soured with sampalok, or bulalo simmered for hours with corn and pechay.",
  "Seafood": "Fish and shellfish from the palengke cook fast. Paksiw na bangus stews in vinegar and ginger, and ginataang hipon simmers shrimp in gata with kalabasa.",
  "Vegetables": "Gulay dishes stretch the budget and the rice. Pinakbet from Ilocos gets its salt from bagoong, and ginisang monggo with malunggay is the classic Friday ulam.",
  "Rice & noodles": "Pancit shows up at every birthday because long noodles stand for long life. Garlic sinangag is how last night's rice becomes breakfast, and arroz caldo is what you make for someone who is sick.",
  "Desserts": "Filipino sweets lean on malagkit and coconut. Leche flan and buko pandan come out at handaan, and bibingka and puto bumbong are what people line up for after Simbang Gabi.",
  "Drinks": "Sago't gulaman and buko juice cool down a hot afternoon. Salabat with ginger and tsokolate batirol made from tablea are for cold mornings and rainy days.",
  "More ulam": "The odd ones out: sawsawan like sinamak and lechon sauce, pulutan like adobong mani, and street food like balut. Some are regional, like etag from the Cordillera and tamilok from Palawan.",
};

/** `?page=N` as a positive integer; null for anything else so the page can 404. */
function pageParam(value: string | string[] | undefined): number | null {
  if (value === undefined) return 1;
  return typeof value === "string" && /^[1-9]\d{0,4}$/.test(value) ? Number(value) : null;
}

/** One route serves three kinds of page: a category listing, a curated dish, or a dish from the collection. */
export async function generateMetadata({ params, searchParams }: PageProps<"/recipes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const path = `/recipes/${slug}`;
  const category = categoryFromSlug(slug);
  if (category) {
    const search = await searchParams;
    const page = pageParam(search.page) ?? 1;
    const query = typeof search.q === "string" ? search.q : "";
    const result = await loadCategoryPage(category, page, query);
    const title = `Filipino ${category} Recipes${page > 1 ? ` – Page ${page}` : ""}`;
    const description = `${result.total.toLocaleString()} ${category.toLowerCase()} dishes from the Kain Na! collection, with ingredients and cooking steps.`;
    const canonical = page > 1 ? `${path}?page=${page}` : path;
    return { title, description, alternates: { canonical }, ...(query.trim() ? { robots: { index: false, follow: true } } : {}), openGraph: { title: `${title} | Kain Na!`, description, url: absoluteUrl(canonical), type: "website" } };
  }
  const dish = await loadDish(slug);
  if (dish) {
    const title = recipeSeoTitle(dish.name_tl, dish.name_en);
    const description = recipeSeoDescription(dish.description_tl, `Cook ${dish.name_en} in ${dish.cook_minutes} minutes with ingredients and step-by-step directions.`);
    const socialImage = recipeSocialImage("ulam", slug);
    return {
      title, description, alternates: { canonical: path },
      openGraph: { title: `${dish.name_tl} Recipe | Kain Na!`, description, url: absoluteUrl(path), type: "article", images: [{ url: socialImage, width: 1200, height: 630, type: "image/png", alt: `${dish.name_tl} Filipino recipe` }] },
      twitter: { card: "summary_large_image", title: `${dish.name_tl} Recipe | Kain Na!`, description, images: [socialImage] },
    };
  }
  const item = await loadCatalogItem(slug);
  if (!item || item.recipe_slug || item.merienda_slug) return {};
  const description = item.catalog_recipe
    ? recipeSeoDescription(item.catalog_recipe.intro, `Find ingredients and learn how to cook ${item.title} in ${formatDuration(item.catalog_recipe.minutes)}.`)
    : `Explore ${item.title} in the Kain Na! Filipino food collection.`;
  const socialImage = recipeSocialImage("catalog", item.id);
  const indexable = Boolean(item.catalog_recipe);
  return {
    title: indexable ? recipeSeoTitle(item.title) : item.title,
    description,
    alternates: { canonical: path },
    robots: { index: indexable, follow: true, googleBot: { index: indexable, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: { title: `${item.title} Recipe | Kain Na!`, description, url: absoluteUrl(path), type: "article", images: [{ url: socialImage, width: 1200, height: 630, type: "image/png", alt: `${item.title} Filipino recipe` }] },
    twitter: { card: "summary_large_image", title: `${item.title} Recipe | Kain Na!`, description, images: [socialImage] },
  };
}

function categorySchemas(category: string, path: string, result: CatalogResult): Record<string, unknown>[] {
  const url = absoluteUrl(result.page > 1 ? `${path}?page=${result.page}` : path);
  const offset = (result.page - 1) * result.limit;
  return [
    {
      "@context": "https://schema.org", "@type": "CollectionPage", "@id": `${url}#page`, url, name: `Filipino ${category} Recipes`,
      description: CATEGORY_INTROS[category], inLanguage: "en-PH", isPartOf: { "@type": "WebSite", url: absoluteUrl("/") },
      mainEntity: { "@type": "ItemList", numberOfItems: result.total, itemListElement: result.items.map((item, index) => ({ "@type": "ListItem", position: offset + index + 1, url: absoluteUrl(foodHref(item)), name: item.title })) },
    },
    recipeBreadcrumbs(category, "Recipes", "/recipes", categoryHref(category)),
  ];
}

export default async function Page({ params, searchParams }: PageProps<"/recipes/[slug]">) {
  const { slug } = await params;
  const path = `/recipes/${slug}`;
  const category = categoryFromSlug(slug);
  if (category) {
    const search = await searchParams;
    const page = pageParam(search.page);
    if (page === null) notFound();
    const query = typeof search.q === "string" ? search.q : "";
    const result = await loadCategoryPage(category, page, query);
    if (page > 1 && page > Math.ceil(result.total / result.limit)) notFound();
    return <>{categorySchemas(category, path, result).map((schema, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />)}<Discover key={`${page}:${query}`} initialCategory={category} initialQuery={query} initialPage={page} initialResult={result} intro={CATEGORY_INTROS[category]} /></>;
  }
  const dish = await loadDish(slug);
  if (dish) return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ulamRecipeSchema(dish)) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(recipeBreadcrumbs(dish.name_tl, "Recipes", "/recipes", path)) }} /><DishDetail dish={dish} /></>;
  const item = await loadCatalogItem(slug);
  if (!item) notFound();
  // Dishes with a curated recipe page live at that page.
  if (item.recipe_slug || item.merienda_slug) permanentRedirect(foodHref(item));
  return <CatalogRecipe item={item} path={path} />;
}
