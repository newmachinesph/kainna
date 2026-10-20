import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TIERS } from "@/lib/config";
import { absoluteUrl } from "@/lib/site";
import { jsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "About Kain Na! and How We Estimate Costs",
  description: "What Kain Na! is, what is in the recipe collection, and exactly how the peso cost of each dish and weekly meal plan is estimated from a wet-market price list.",
  alternates: { canonical: "/about" },
};
export const dynamic = "force-dynamic";

type Health = { catalog_images: number; ulam_recipes: number; merienda_recipes: number; catalog_recipes: number };
type Ingredient = { price_updated_at: string; price_source: string };

const FACEBOOK = "https://www.facebook.com/kainnarecipes";

function monthYear(date: string): string {
  const parsed = new Date(`${date}T00:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" }).format(parsed);
}

export default async function AboutPage() {
  const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
  // Dishes with any recipe: a collection recipe, or a curated ulam/merienda page (the same count as the home page).
  const [healthResponse, ingredientsResponse, recipesResponse] = await Promise.all([
    fetch(`${base}/health`, { cache: "no-store" }),
    fetch(`${base}/v1/ingredients`, { cache: "no-store" }),
    fetch(`${base}/v1/catalog?limit=1&recipes_only=true`, { cache: "no-store" }),
  ]);
  if (!healthResponse.ok || !ingredientsResponse.ok || !recipesResponse.ok) throw new Error("Site details unavailable");
  const health = await healthResponse.json() as Health;
  const { total: withRecipe } = await recipesResponse.json() as { total: number };
  const { items: ingredients } = await ingredientsResponse.json() as { items: Ingredient[] };
  const latest = ingredients.reduce((newest, item) => item.price_updated_at > newest.price_updated_at ? item : newest, ingredients[0]);
  // "DA Bantay Presyo – NCR weekly average, Aug 2026" reads as "the Department of Agriculture's Bantay Presyo, NCR weekly average".
  const priceSource = latest?.price_source.replace(/^DA /, "the Department of Agriculture's ").replace(/\s*[–-]\s*/, ", ").replace(/,\s*[A-Z][a-z]{2,8}\.? \d{4}$/, "") ?? "a Philippine wet-market price list";
  const priceMonth = latest ? monthYear(latest.price_updated_at) : "";
  const [tipid, , maluwag] = TIERS;
  const count = (value: number) => value.toLocaleString("en-PH");

  const url = absoluteUrl("/about");
  const organization = {
    "@context": "https://schema.org", "@type": "Organization", "@id": `${absoluteUrl("/")}#organization`, name: "Kain Na!", url: absoluteUrl("/"),
    logo: absoluteUrl("/brand/kain-na-logo.svg"), sameAs: [FACEBOOK],
    description: "Filipino home recipes with ingredients and steps, estimated peso costs per serving, and weekly ulam plans for households cooking on ₱200, ₱300 or ₱500 a day.",
    areaServed: { "@type": "Country", name: "Philippines" },
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: FACEBOOK },
  };
  const aboutPage = {
    "@context": "https://schema.org", "@type": "AboutPage", "@id": `${url}#webpage`, url, name: "About Kain Na!", inLanguage: "en-PH",
    description: "How Kain Na! builds its Filipino recipe collection and estimates the peso cost of dishes and weekly meal plans.",
    isPartOf: { "@id": `${absoluteUrl("/")}#website` }, about: { "@id": `${absoluteUrl("/")}#organization` }, mainEntity: { "@id": `${absoluteUrl("/")}#organization` },
  };

  return <div className="pb-16 pt-10">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(aboutPage) }} />
    <p className="eyebrow">About</p>
    <h1 className="section-title mt-3">About Kain Na!</h1>
    <div className="mt-6 max-w-[64ch] space-y-10 text-[17px] leading-relaxed">
      <section>
        <p className="text-ink-soft">Kain Na! is for Filipino households that cook at home and watch what they spend at the palengke. You can look up how to cook a dish, see roughly what it costs, and plan a week of ulam that fits a daily food budget.</p>
      </section>
      <section>
        <h2 className="text-2xl font-bold">What is in the collection</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
          <li>{count(health.catalog_images)} Filipino dishes with photos, sorted into chicken, pork and beef, seafood, vegetables, rice and noodles, desserts, drinks and other ulam.</li>
          <li>{withRecipe >= health.catalog_images ? "Every one of them has" : `${count(withRecipe)} of those have`} a full recipe page with ingredient amounts, numbered steps, total cooking time and servings.</li>
          <li>{count(health.ulam_recipes)} everyday ulam make up the weekly meal planner. These are the dishes with a peso cost per serving.</li>
          <li>{count(health.merienda_recipes)} merienda recipes, like banana cue and bibingka.</li>
        </ul>
        <p className="mt-3 text-ink-soft">Browse them all on the <Link href="/recipes/a-z" className="font-bold underline">A to Z list</Link> or search from <Link href="/recipes" className="font-bold underline">Explore food</Link>.</p>
      </section>
      <section>
        <h2 className="text-2xl font-bold">How we estimate costs</h2>
        <p className="mt-3 text-ink-soft">Costs on Kain Na! are estimates, not live quotes from a store or market. Here is how they are worked out.</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-soft">
          <li>We keep a price list of {count(ingredients.length)} common ingredients, priced per kilo, piece, bundle, can or pack. The current list comes from {priceSource}{priceMonth ? `, last updated ${priceMonth}` : ""}. Each price is rounded to the nearest ₱5.</li>
          <li>Every planner dish lists how much of each ingredient it uses, for example 400 grams of liempo in Bicol express, or one bundle of kangkong in sinigang na baboy.</li>
          <li>We multiply each quantity by its listed price, add them up, and divide by the number of servings the recipe makes. That gives the cost per serving.</li>
          <li>For your household, we multiply the cost per serving by the number of people eating and round to the nearest ₱5.</li>
          <li>The palengke list adds up the same ingredients across the week and rounds amounts up to what you would actually ask for at the stall, like the next 50 grams of meat or a whole bundle of greens.</li>
        </ol>
        <p className="mt-3 text-ink-soft">The <Link href="/budget" className="font-bold underline">budget meal plans</Link> are sample weeks at ₱200, ₱300 and ₱500 a day for households of three to six. The ₱{tipid.daily_php} plans price ingredients {Math.round((1 - tipid.price_multiplier) * 100)}% below the list and the ₱{maluwag.daily_php} plans {Math.round((maluwag.price_multiplier - 1) * 100)}% above it. Prices differ by region, stall and season, so treat the totals as a guide. If you log what you actually paid in the weekly check-in, your own prices replace the list prices in your plan.</p>
        <p className="mt-3 text-ink-soft">Recipes outside the planner do not show a cost yet. Their ingredient lists are written for cooking, not linked to the price list.</p>
      </section>
      <section>
        <h2 className="text-2xl font-bold">How recipes are written</h2>
        <p className="mt-3 text-ink-soft">Each recipe starts from published home-cooking versions of the dish and is written up in plain steps with measured ingredients. Before a recipe goes live it must have an introduction, total time, servings, an ingredient list and steps. Dish names stay in Filipino, with the English name alongside when it helps. If something looks wrong in a recipe or a price, tell us and we will fix it.</p>
      </section>
      <section>
        <h2 className="text-2xl font-bold">Contact</h2>
        <p className="mt-3 text-ink-soft">The easiest way to reach us is a message on our Facebook page.</p>
        <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" className="text-link mt-4">Kain Na! on Facebook <ArrowUpRight size={17} /></a>
      </section>
    </div>
  </div>;
}
