import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { FoodImage } from "@/components/FoodImage";
import { QuickAnswers, RecipeFacts, catalogFacts, categoryNoun, formatDuration } from "@/components/RecipeFacts";
import { categoryHref, foodHref } from "@/lib/catalog-urls";
import { catalogRecipeSchema, jsonLd, recipeBreadcrumbs } from "@/lib/structured-data";

export { formatDuration };

export type CatalogRecipeData = { title: string; intro: string; minutes: number; servings: number; ingredients: string[]; steps: string[] };
export type FoodItem = { id: string; title: string; category: string; image: string; recipe_slug: string | null; merienda_slug: string | null; source_url: string | null; catalog_recipe: CatalogRecipeData | null };
type RelatedItem = Pick<FoodItem, "id" | "title" | "category" | "image" | "recipe_slug" | "merienda_slug">;

const API = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
const RELATED_COUNT = 4;

export async function loadCatalogItem(slug: string): Promise<FoodItem | null> {
  const response = await fetch(`${API}/v1/catalog/slug/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Food catalog unavailable");
  return response.json() as Promise<FoodItem>;
}

/** Other dishes with recipes in the same category; the page still renders if this fails. */
async function loadRelated(item: FoodItem): Promise<RelatedItem[]> {
  try {
    const response = await fetch(`${API}/v1/catalog?limit=${RELATED_COUNT + 1}&page=1&recipes_only=true&category=${encodeURIComponent(item.category)}&rotate=daily`, { cache: "no-store" });
    if (!response.ok) return [];
    const result = await response.json() as { items: RelatedItem[] };
    return result.items.filter((other) => other.id !== item.id).slice(0, RELATED_COUNT);
  } catch (error) {
    console.error("Related recipes unavailable", error);
    return [];
  }
}

/** A dish from the collection, rendered at /recipes/<slug>. */
export async function CatalogRecipe({ item, path }: { item: FoodItem; path: string }) {
  const recipe = item.catalog_recipe;
  const related = recipe ? await loadRelated(item) : [];
  const facts = recipe ? catalogFacts(item, recipe) : null;
  const moreLabel = `More ${categoryNoun(item.category)} recipes`;
  return (
    <div className="pb-16 pt-7">
      {recipe && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(catalogRecipeSchema(item, recipe, path)) }} />}
      {recipe && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(recipeBreadcrumbs(item.title, item.category, categoryHref(item.category), path)) }} />}
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
      {facts && <RecipeFacts data={facts} />}
      {recipe && <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <section><h2 className="text-2xl font-bold">Ingredients for {item.title}</h2><ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-card">{recipe.ingredients.map((value, index) => <li key={index} className="px-4 py-3 text-sm">{value}</li>)}</ul></section>
        <section><h2 className="text-2xl font-bold">How to cook {item.title}</h2><ol className="mt-4 space-y-3">{recipe.steps.map((value, index) => <li key={index} className="flex gap-3 rounded-xl border border-line bg-card p-4 text-sm leading-relaxed"><span className="font-bold text-accent">{index + 1}.</span><span>{value}</span></li>)}</ol></section>
      </div>}
      {facts && <QuickAnswers answers={facts.answers} />}
      {related.length > 0
        ? <section className="mt-14 border-t border-line pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-2xl font-bold">{moreLabel}</h2><Link href={categoryHref(item.category)} className="text-link">See all {item.category.toLowerCase()} <ArrowUpRight size={16} /></Link></div>
          <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{related.map((other) => <li key={other.id}><Link href={foodHref(other)} className="block overflow-hidden rounded-[12px] border border-line bg-card hover:border-line-strong"><div className="aspect-[4/3] bg-photo"><FoodImage src={other.image} alt={other.title} loading="lazy" className="h-full w-full object-cover" /></div><span className="display line-clamp-2 p-2.5 text-[15px]">{other.title}</span></Link></li>)}</ul>
        </section>
        : <div className="mt-14 border-t border-line pt-8"><p className="eyebrow">Keep exploring</p><Link href={categoryHref(item.category)} className="text-link mt-4">{moreLabel} <ArrowUpRight size={16} /></Link></div>}
    </div>
  );
}
