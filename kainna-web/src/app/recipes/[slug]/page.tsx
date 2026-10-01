import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DishDetail } from "@/components/DishDetail";
import type { Dish } from "@/lib/types";
import { absoluteUrl } from "@/lib/site";
import { recipeSeoDescription, recipeSeoTitle, recipeSocialImage } from "@/lib/recipe-seo";
import { jsonLd, recipeBreadcrumbs, ulamRecipeSchema } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

async function loadDish(slug: string): Promise<Dish | null> {
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}/v1/recipes/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Recipes unavailable");
  return response.json() as Promise<Dish>;
}

export async function generateMetadata({ params }: PageProps<"/recipes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const dish = await loadDish(slug);
  if (!dish) return {};
  const title = recipeSeoTitle(dish.name_en);
  const description = recipeSeoDescription(dish.description_tl, `Cook ${dish.name_en} in ${dish.cook_minutes} minutes with ingredients and step-by-step directions.`);
  const socialImage = recipeSocialImage("ulam", slug);
  return {
    title,
    description,
    alternates: { canonical: `/recipes/${slug}` },
    openGraph: { title: `${dish.name_en} Recipe | Kain Na!`, description, url: absoluteUrl(`/recipes/${slug}`), type: "article", images: [{ url: socialImage, width: 1200, height: 630, type: "image/png", alt: `${dish.name_en} Filipino recipe` }] },
    twitter: { card: "summary_large_image", title: `${dish.name_en} Recipe | Kain Na!`, description, images: [socialImage] },
  };
}

export default async function Page({ params }: PageProps<"/recipes/[slug]">) {
  const { slug } = await params;
  const dish = await loadDish(slug);
  if (!dish) notFound();
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ulamRecipeSchema(dish)) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(recipeBreadcrumbs(dish.name_en, "Recipes", "/recipes", `/recipes/${slug}`)) }} /><DishDetail dish={dish} /></>;
}
