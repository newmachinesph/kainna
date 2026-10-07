import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { DishDetail } from "@/components/DishDetail";
import { CatalogRecipe, formatDuration, loadCatalogItem } from "@/components/CatalogRecipe";
import { Discover, type CatalogResult } from "@/components/Discover";
import type { Dish } from "@/lib/types";
import { absoluteUrl } from "@/lib/site";
import { categoryFromSlug, foodHref } from "@/lib/catalog-urls";
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

export async function loadCategoryPage(category: string): Promise<CatalogResult> {
  const response = await fetch(`${API}/v1/catalog?limit=24&page=1&category=${encodeURIComponent(category)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Food catalog unavailable");
  return response.json() as Promise<CatalogResult>;
}

/** One route serves three kinds of page: a category listing, a curated dish, or a dish from the collection. */
export async function generateMetadata({ params }: PageProps<"/recipes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const path = `/recipes/${slug}`;
  const category = categoryFromSlug(slug);
  if (category) {
    const result = await loadCategoryPage(category);
    const title = `Filipino ${category} Recipes`;
    const description = `${result.total.toLocaleString()} ${category.toLowerCase()} dishes from the Kain Na! collection, with ingredients and cooking steps.`;
    return { title, description, alternates: { canonical: path }, openGraph: { title: `${title} | Kain Na!`, description, url: absoluteUrl(path), type: "website" } };
  }
  const dish = await loadDish(slug);
  if (dish) {
    const title = recipeSeoTitle(dish.name_en);
    const description = recipeSeoDescription(dish.description_tl, `Cook ${dish.name_en} in ${dish.cook_minutes} minutes with ingredients and step-by-step directions.`);
    const socialImage = recipeSocialImage("ulam", slug);
    return {
      title, description, alternates: { canonical: path },
      openGraph: { title: `${dish.name_en} Recipe | Kain Na!`, description, url: absoluteUrl(path), type: "article", images: [{ url: socialImage, width: 1200, height: 630, type: "image/png", alt: `${dish.name_en} Filipino recipe` }] },
      twitter: { card: "summary_large_image", title: `${dish.name_en} Recipe | Kain Na!`, description, images: [socialImage] },
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

export default async function Page({ params }: PageProps<"/recipes/[slug]">) {
  const { slug } = await params;
  const path = `/recipes/${slug}`;
  const category = categoryFromSlug(slug);
  if (category) return <Discover initialCategory={category} initialResult={await loadCategoryPage(category)} />;
  const dish = await loadDish(slug);
  if (dish) return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ulamRecipeSchema(dish)) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(recipeBreadcrumbs(dish.name_en, "Recipes", "/recipes", path)) }} /><DishDetail dish={dish} /></>;
  const item = await loadCatalogItem(slug);
  if (!item) notFound();
  // Dishes with a curated recipe page live at that page.
  if (item.recipe_slug || item.merienda_slug) permanentRedirect(foodHref(item));
  return <CatalogRecipe item={item} path={path} />;
}
