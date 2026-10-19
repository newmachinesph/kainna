import { INGREDIENTS } from "@/lib/data";
import { buildPriceMap, dishCostPerServing } from "@/lib/costing";
import { CATEGORY_SLUGS, catalogSlug } from "@/lib/catalog-urls";
import { peso } from "@/lib/format";
import { livePrices } from "@/lib/live-prices";
import { absoluteUrl } from "@/lib/site";
import type { Dish } from "@/lib/types";

export const dynamic = "force-dynamic";

type SeoIndex = { catalog_ids: string[]; ulam_slugs: string[]; merienda_slugs: string[] };
type CatalogItem = { id: string; title: string; category: string; recipe_slug?: string | null; merienda_slug?: string | null; recipe: { intro?: string | null; minutes?: number | null; servings?: number | null } | null };
type Merienda = { slug: string; title: string; intro: string; minutes: number; servings: number };
type Entry = { category: string; url: string; line: string };

async function getJson<T>(base: string, path: string): Promise<T> {
  const response = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} unavailable`);
  return await response.json() as T;
}

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim().replace(/\.$/, "");
const bullet = (title: string, url: string, details: (string | number | false | null | undefined)[]) =>
  `- [${title.replace(/[[\]]/g, "")}](${url})${details.some(Boolean) ? `: ${details.filter(Boolean).join(", ")}` : ""}`;

export async function GET() {
  const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
  const [index, ulam, merienda, catalog, prices] = await Promise.all([
    getJson<SeoIndex>(base, "/v1/seo-index"),
    getJson<{ items: Dish[] }>(base, "/v1/recipes"),
    getJson<{ items: Merienda[] }>(base, "/v1/merienda"),
    getJson<{ items: CatalogItem[] }>(base, "/v1/seo-catalog").then((result) => result.items),
    livePrices(),
  ]);
  const priceMap = buildPriceMap(INGREDIENTS, prices);
  const categoryOf = new Map<string, string>();
  for (const item of catalog) {
    if (item.recipe_slug && !categoryOf.has(`ulam:${item.recipe_slug}`)) categoryOf.set(`ulam:${item.recipe_slug}`, item.category);
    if (item.merienda_slug && !categoryOf.has(`merienda:${item.merienda_slug}`)) categoryOf.set(`merienda:${item.merienda_slug}`, item.category);
  }
  const catalogById = new Map(catalog.map((item) => [item.id, item]));
  const ulamSlugs = new Set(index.ulam_slugs);
  const meriendaSlugs = new Set(index.merienda_slugs);

  const entries: Entry[] = [
    ...ulam.items.filter((dish) => ulamSlugs.has(dish.slug)).map((dish) => {
      const title = dish.name_en && dish.name_en.toLowerCase() !== dish.name_tl.toLowerCase() ? `${dish.name_tl} (${dish.name_en})` : dish.name_tl;
      const cost = dishCostPerServing(dish, priceMap);
      return {
        category: categoryOf.get(`ulam:${dish.slug}`) ?? "More ulam",
        url: absoluteUrl(`/recipes/${encodeURIComponent(dish.slug)}`),
        line: bullet(title, absoluteUrl(`/recipes/${encodeURIComponent(dish.slug)}`), [dish.description_tl && oneLine(dish.description_tl), `${dish.cook_minutes} min`, `serves ${dish.servings}`, cost > 0 && `about ${peso(cost)} a serving`]),
      };
    }),
    ...merienda.items.filter((recipe) => meriendaSlugs.has(recipe.slug)).map((recipe) => {
      const url = absoluteUrl(`/merienda/${encodeURIComponent(recipe.slug)}`);
      return { category: categoryOf.get(`merienda:${recipe.slug}`) ?? "Desserts", url, line: bullet(recipe.title, url, [recipe.intro && oneLine(recipe.intro), `${recipe.minutes} min`, `serves ${recipe.servings}`]) };
    }),
    ...index.catalog_ids.flatMap((id) => {
      const item = catalogById.get(id);
      if (!item) return [];
      const { recipe } = item;
      const url = absoluteUrl(`/recipes/${encodeURIComponent(catalogSlug(id))}`);
      return [{ category: item.category, url, line: bullet(item.title, url, [recipe?.intro ? oneLine(recipe.intro) : null, recipe?.minutes ? `${recipe.minutes} min` : null, recipe?.servings ? `serves ${recipe.servings}` : null]) }];
    }),
  ];

  const seen = new Set<string>();
  const groups = new Map<string, string[]>(Object.keys(CATEGORY_SLUGS).map((name) => [name, []]));
  for (const entry of entries) {
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    groups.set(entry.category, [...(groups.get(entry.category) ?? []), entry.line]);
  }
  const sections = [...groups.entries()].filter(([, lines]) => lines.length).map(([name, lines]) => {
    const href = CATEGORY_SLUGS[name] ? ` ([browse](${absoluteUrl(`/recipes/${CATEGORY_SLUGS[name]}`)}))` : "";
    return `## ${name}${href}\n\n${lines.sort((a, b) => a.localeCompare(b, "en")).join("\n")}`;
  });

  const body = [
    "# Kain Na! full recipe list",
    "",
    `> Every recipe page on kainna.ph (${seen.size} in all), grouped by category. Each line gives the dish, a one-line description, total cooking time and servings. Dishes in the weekly ulam planner also show an estimated cost per serving in Philippine pesos, worked out from ingredient quantities and a wet-market price list (DA Bantay Presyo, NCR weekly averages). These are estimates, not live market quotes.`,
    "",
    `Short version: ${absoluteUrl("/llms.txt")}. How costs are estimated: ${absoluteUrl("/about")}.`,
    "",
    ...sections.flatMap((section) => [section, ""]),
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
