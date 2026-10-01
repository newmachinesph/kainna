import type { Metadata } from "next";
import Link from "next/link";
import { FoodImage } from "@/components/FoodImage";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen } from "lucide-react";
import { absoluteUrl, publicImageUrl } from "@/lib/site";
import { recipeSeoDescription, recipeSeoTitle, recipeSocialImage } from "@/lib/recipe-seo";
import { jsonLd, recipeBreadcrumbs } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

type CatalogRecipe = { title: string; intro: string; minutes: number; servings: number; ingredients: string[]; steps: string[] };
type FoodItem = { title: string; category: string; image: string; recipe_slug: string | null; merienda_slug: string | null; source_url: string | null; catalog_recipe: CatalogRecipe | null };

function formatDuration(minutes: number): string {
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

async function loadItem(id: string): Promise<FoodItem | null> {
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}/v1/catalog/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Food catalog unavailable");
  return response.json() as Promise<FoodItem>;
}

export async function generateMetadata({ params }: PageProps<"/discover/[id]">): Promise<Metadata> {
  const { id } = await params;
  const item = await loadItem(id);
  if (!item) return {};
  const description = item.catalog_recipe
    ? recipeSeoDescription(item.catalog_recipe.intro, `Find ingredients and learn how to cook ${item.title} in ${formatDuration(item.catalog_recipe.minutes)}.`)
    : `Explore ${item.title} in the Kain Na! Filipino food collection.`;
  const socialImage = recipeSocialImage("catalog", id);
  const canonical = item.recipe_slug ? `/recipes/${item.recipe_slug}` : item.merienda_slug ? `/merienda/${item.merienda_slug}` : `/discover/${id}`;
  const isCanonicalRecipe = Boolean(item.catalog_recipe) && !item.recipe_slug && !item.merienda_slug;
  return {
    title: isCanonicalRecipe ? recipeSeoTitle(item.title) : item.title,
    description,
    alternates: { canonical },
    robots: { index: isCanonicalRecipe, follow: true, googleBot: { index: isCanonicalRecipe, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: { title: `${item.title} Recipe | Kain Na!`, description, url: absoluteUrl(canonical), type: "article", images: [{ url: socialImage, width: 1200, height: 630, type: "image/png", alt: `${item.title} Filipino recipe` }] },
    twitter: { card: "summary_large_image", title: `${item.title} Recipe | Kain Na!`, description, images: [socialImage] },
  };
}

export default async function FoodPage({ params }: PageProps<"/discover/[id]">) {
  const { id } = await params;
  const item = await loadItem(id);
  if (!item) notFound();
  const recipeHref = item.recipe_slug ? `/recipes/${item.recipe_slug}` : item.merienda_slug ? `/merienda/${item.merienda_slug}` : null;
  const recipeSchema = item.catalog_recipe ? { "@context": "https://schema.org", "@type": "Recipe", "@id": `${absoluteUrl(`/discover/${id}`)}#recipe`, name: item.title, description: item.catalog_recipe.intro, image: publicImageUrl(item.image), url: absoluteUrl(`/discover/${id}`), mainEntityOfPage: absoluteUrl(`/discover/${id}`), inLanguage: "en-PH", recipeCuisine: "Filipino", recipeCategory: item.category, recipeYield: `${item.catalog_recipe.servings} servings`, totalTime: `PT${item.catalog_recipe.minutes}M`, recipeIngredient: item.catalog_recipe.ingredients, recipeInstructions: item.catalog_recipe.steps.map((text, index) => ({ "@type": "HowToStep", position: index + 1, text })), author: { "@type": "Organization", name: "Kain Na!", url: absoluteUrl("/") } } : null;
  return (
    <div className="pb-16 pt-7">
      {recipeSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(recipeSchema) }} />}
      {recipeSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(recipeBreadcrumbs(item.title, "Recipes", "/recipes", `/discover/${id}`)) }} />}
      <Link href="/recipes" className="text-link"><ArrowLeft size={16} /> Back to all food</Link>
      <div className="mt-7 grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] md:gap-12">
        <div className="aspect-[16/10] overflow-hidden rounded-[20px] bg-photo"><FoodImage src={item.image} alt={item.title} variant="full" className="h-full w-full object-cover" /></div>
        <div className="flex flex-col justify-center">
          <p className="eyebrow">{item.category} · Kain Na! collection</p>
          <h1 className="section-title mt-4">{item.title}</h1>
          <p className="mt-5 max-w-[43ch] leading-relaxed text-ink-soft">{item.catalog_recipe?.intro ?? "Discover this Filipino dish and find a way to cook it for your table."}</p>
          {item.catalog_recipe ? <p className="mt-6 text-sm font-semibold">{formatDuration(item.catalog_recipe.minutes)} · Serves {item.catalog_recipe.servings}</p> : recipeHref ? <Link href={recipeHref} className="brand-button mt-8 w-fit"><BookOpen size={18} /> Cook this recipe</Link> : item.source_url ? <div className="mt-8"><p className="text-sm text-muted">The original publisher has a recipe for this dish.</p><a href={item.source_url} target="_blank" rel="noopener noreferrer" className="brand-button mt-4 w-fit">Open the source recipe <ArrowUpRight size={17} /></a></div> : <p className="mt-8 text-sm text-muted">An in-app recipe is being prepared.</p>}
        </div>
      </div>
      {item.catalog_recipe && <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]"><section><h2 className="text-2xl font-bold">Ingredients for {item.title}</h2><ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-card">{item.catalog_recipe.ingredients.map((value, index) => <li key={index} className="px-4 py-3 text-sm">{value}</li>)}</ul></section><section><h2 className="text-2xl font-bold">How to cook {item.title}</h2><ol className="mt-4 space-y-3">{item.catalog_recipe.steps.map((value, index) => <li key={index} className="flex gap-3 rounded-xl border border-line bg-card p-4 text-sm leading-relaxed"><span className="font-bold text-accent">{index + 1}.</span><span>{value}</span></li>)}</ol>{item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-link mt-6">Original inspiration <ArrowUpRight size={16} /></a>}</section></div>}
      <div className="mt-14 border-t border-line pt-8"><p className="eyebrow">Keep exploring</p><Link href="/recipes" className="text-link mt-4">Browse the collection <ArrowUpRight size={16} /></Link></div>
    </div>
  );
}
