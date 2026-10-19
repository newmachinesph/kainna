import type { Metadata } from "next";
import Link from "next/link";
import { FoodImage } from "@/components/FoodImage";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, Users } from "lucide-react";
import { SaveRecipeButton } from "@/components/SaveRecipeButton";
import { CookSteps } from "@/components/CookSteps";
import { QuickAnswers, RecipeFacts, meriendaFacts } from "@/components/RecipeFacts";
import { absoluteUrl } from "@/lib/site";
import { recipeSeoDescription, recipeSeoTitle, recipeSocialImage, titleCase } from "@/lib/recipe-seo";
import { jsonLd, meriendaRecipeSchema, recipeBreadcrumbs } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

type Merienda = { slug: string; title: string; image: string; kind: string; intro: string; minutes: number; servings: number; ingredients: string[]; steps: string[] };

async function loadRecipe(slug: string): Promise<Merienda | null> {
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}/v1/merienda/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Merienda recipes unavailable");
  return response.json() as Promise<Merienda>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await loadRecipe(slug);
  if (!recipe) return {};
  const description = recipeSeoDescription(recipe.intro, `Find the ingredients and learn how to make ${recipe.title} in ${recipe.minutes} minutes.`);
  const socialImage = recipeSocialImage("merienda", slug);
  return {
    title: recipeSeoTitle(recipe.title, recipe.kind ? titleCase(recipe.kind) : undefined), description, alternates: { canonical: `/merienda/${slug}` },
    openGraph: { title: `${recipe.title} Recipe | Kain Na!`, description, url: absoluteUrl(`/merienda/${slug}`), type: "article", images: [{ url: socialImage, width: 1200, height: 630, type: "image/png", alt: `${recipe.title} Filipino recipe` }] },
    twitter: { card: "summary_large_image", title: `${recipe.title} Recipe | Kain Na!`, description, images: [socialImage] },
  };
}

export default async function MeriendaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = await loadRecipe(slug);
  if (!recipe) notFound();
  const facts = meriendaFacts(recipe);
  return <article className="pb-16 pt-8"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(meriendaRecipeSchema(recipe)) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(recipeBreadcrumbs(recipe.title, "Merienda", "/merienda", `/merienda/${slug}`)) }} /><Link href="/merienda" className="text-link"><ArrowLeft size={16} /> All merienda</Link><div className="mt-7 grid gap-8 md:grid-cols-2 md:gap-12"><div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-photo"><FoodImage src={recipe.image} alt={recipe.title} variant="full" className="h-full w-full object-cover" /></div><div className="flex flex-col justify-center"><p className="eyebrow">Merienda & sweets</p><h1 className="section-title mt-4">{recipe.title}</h1><p className="mt-2 text-lg text-muted">{recipe.kind}</p><p className="mt-6 max-w-[43ch] leading-relaxed text-ink-soft">{recipe.intro}</p><div className="mt-7 flex gap-6 text-sm font-semibold"><span className="flex items-center gap-2"><Clock3 size={16} className="text-accent" /> {recipe.minutes} min</span><span className="flex items-center gap-2"><Users size={16} className="text-accent" /> Serves {recipe.servings}</span></div><div className="mt-7"><SaveRecipeButton slug={recipe.slug} /></div></div></div><RecipeFacts data={facts} /><div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]"><section><h2 className="text-2xl">What you need for {recipe.title}</h2><ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-card">{recipe.ingredients.map((item) => <li key={item} className="px-4 py-3 text-sm">{item}</li>)}</ul></section><section><CookSteps steps={recipe.steps} title={`How to make ${recipe.title}`} /></section></div><QuickAnswers answers={facts.answers} /></article>;
}
