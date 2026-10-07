import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { FoodImage } from "@/components/FoodImage";
import { absoluteUrl, publicImageUrl } from "@/lib/site";
import { categoryHref } from "@/lib/catalog-urls";
import { jsonLd, recipeBreadcrumbs } from "@/lib/structured-data";

export type CatalogRecipeData = { title: string; intro: string; minutes: number; servings: number; ingredients: string[]; steps: string[] };
export type FoodItem = { id: string; title: string; category: string; image: string; recipe_slug: string | null; merienda_slug: string | null; source_url: string | null; catalog_recipe: CatalogRecipeData | null };

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  return [
    days && `${days} ${days === 1 ? "day" : "days"}`,
    hours && `${hours} ${hours === 1 ? "hour" : "hours"}`,
    remainingMinutes && `${remainingMinutes} minutes`,
  ].filter(Boolean).join(" ");
}

export async function loadCatalogItem(slug: string): Promise<FoodItem | null> {
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}/v1/catalog/slug/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Food catalog unavailable");
  return response.json() as Promise<FoodItem>;
}

/** A dish from the collection, rendered at /recipes/<slug>. */
export function CatalogRecipe({ item, path }: { item: FoodItem; path: string }) {
  const recipe = item.catalog_recipe;
  const recipeSchema = recipe ? { "@context": "https://schema.org", "@type": "Recipe", "@id": `${absoluteUrl(path)}#recipe`, name: item.title, description: recipe.intro, image: publicImageUrl(item.image), url: absoluteUrl(path), mainEntityOfPage: absoluteUrl(path), inLanguage: "en-PH", recipeCuisine: "Filipino", recipeCategory: item.category, recipeYield: `${recipe.servings} servings`, totalTime: `PT${recipe.minutes}M`, recipeIngredient: recipe.ingredients, recipeInstructions: recipe.steps.map((text, index) => ({ "@type": "HowToStep", position: index + 1, text })), author: { "@type": "Organization", name: "Kain Na!", url: absoluteUrl("/") } } : null;
  return (
    <div className="pb-16 pt-7">
      {recipeSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(recipeSchema) }} />}
      {recipeSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(recipeBreadcrumbs(item.title, item.category, categoryHref(item.category), path)) }} />}
      <Link href={categoryHref(item.category)} className="text-link"><ArrowLeft size={16} /> More {item.category.toLowerCase()}</Link>
      <div className="mt-7 grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] md:gap-12">
        <div className="aspect-[16/10] overflow-hidden rounded-[20px] bg-photo"><FoodImage src={item.image} alt={item.title} variant="full" className="h-full w-full object-cover" /></div>
        <div className="flex flex-col justify-center">
          <p className="eyebrow"><Link href={categoryHref(item.category)} className="hover:underline">{item.category}</Link> · Filipino recipe</p>
          <h1 className="section-title mt-4">{item.title}</h1>
          <p className="mt-5 max-w-[43ch] leading-relaxed text-ink-soft">{recipe?.intro ?? "Discover this Filipino dish and find a way to cook it for your table."}</p>
          {recipe ? <p className="mt-6 text-sm font-semibold">{formatDuration(recipe.minutes)} · Serves {recipe.servings}</p> : <p className="mt-8 text-sm text-muted">The recipe for this dish is being prepared.</p>}
        </div>
      </div>
      {recipe && <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <section><h2 className="text-2xl font-bold">Ingredients for {item.title}</h2><ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-card">{recipe.ingredients.map((value, index) => <li key={index} className="px-4 py-3 text-sm">{value}</li>)}</ul></section>
        <section><h2 className="text-2xl font-bold">How to cook {item.title}</h2><ol className="mt-4 space-y-3">{recipe.steps.map((value, index) => <li key={index} className="flex gap-3 rounded-xl border border-line bg-card p-4 text-sm leading-relaxed"><span className="font-bold text-accent">{index + 1}.</span><span>{value}</span></li>)}</ol></section>
      </div>}
      <div className="mt-14 border-t border-line pt-8"><p className="eyebrow">Keep exploring</p><Link href={categoryHref(item.category)} className="text-link mt-4">More {item.category.toLowerCase()} recipes <ArrowUpRight size={16} /></Link></div>
    </div>
  );
}
