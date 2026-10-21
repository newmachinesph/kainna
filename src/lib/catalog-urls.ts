/** Public URLs for the food collection: every dish lives under /recipes/<slug>. */

export const CATEGORY_SLUGS: Record<string, string> = {
  "Chicken": "chicken",
  "Pork & beef": "pork-and-beef",
  "Seafood": "seafood",
  "Vegetables": "vegetables",
  "Rice & noodles": "rice-and-noodles",
  "Desserts": "desserts",
  "Drinks": "drinks",
  "More ulam": "more-ulam",
};

export function categoryFromSlug(slug: string): string | undefined {
  return Object.keys(CATEGORY_SLUGS).find((name) => CATEGORY_SLUGS[name] === slug);
}

export function categoryHref(name: string): string {
  return CATEGORY_SLUGS[name] ? `/recipes/${CATEGORY_SLUGS[name]}` : "/recipes";
}

/** Catalog ids are "<manifest id>__<title slug>"; only the slug is shown in URLs. */
export function catalogSlug(id: string): string {
  return id.slice(id.indexOf("__") + 2);
}

export function foodHref(item: { id: string; recipe_slug?: string | null; merienda_slug?: string | null }): string {
  if (item.recipe_slug) return `/recipes/${item.recipe_slug}`;
  if (item.merienda_slug) return `/merienda/${item.merienda_slug}`;
  return `/recipes/${catalogSlug(item.id)}`;
}
