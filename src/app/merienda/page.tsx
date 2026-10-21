import type { Metadata } from "next";
import Link from "next/link";
import { FoodImage } from "@/components/FoodImage";
import { ArrowUpRight } from "lucide-react";
import { listMerienda } from "@/server/catalog";

export const metadata: Metadata = { title: "Filipino Merienda & Dessert Recipes", description: "Cook Filipino snacks and desserts with ingredients and step-by-step recipes.", alternates: { canonical: "/merienda" } };
export const dynamic = "force-dynamic";

type Merienda = { slug: string; title: string; image: string; minutes: number; servings: number; kind: string };

export default async function MeriendaPage() {
  const items = (await listMerienda()).items as unknown as Merienda[];
  return <div className="pb-16 pt-10"><p className="eyebrow">Made for sharing</p><h1 className="section-title mt-3">Merienda & sweets</h1><p className="mt-4 max-w-[56ch] text-ink-soft">A little something for slow afternoons, family celebrations, and the sweet end of a meal.</p><div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-5">{items.map((recipe) => <Link key={recipe.slug} href={`/merienda/${recipe.slug}`} className="food-card group"><div className="aspect-[4/3] overflow-hidden rounded-xl bg-photo"><FoodImage src={recipe.image} alt={recipe.title} loading="lazy" /></div><p className="mt-3 text-[11px] font-bold uppercase tracking-[.13em] text-accent">{recipe.minutes} min · serves {recipe.servings}</p><h2 className="mt-1 text-xl font-bold">{recipe.title}</h2><p className="text-sm text-muted">{recipe.kind}</p></Link>)}</div><Link href="/recipes" className="text-link mt-12">Browse all food <ArrowUpRight size={17} /></Link></div>;
}
