import { one, query, type Row } from "./db";
import { HttpError } from "./http";
import { parseJson, rotationRandom, seededRandom, shuffled, weekMonday, withMedia, type Json } from "./util";

const HAS_CATALOG_RECIPE = "EXISTS (SELECT 1 FROM catalog_recipes cr WHERE cr.image_id = catalog_items.id)";

export type CatalogQuery = { q?: string; category?: string; recipesOnly?: boolean; rotate?: "" | "daily" | "weekly"; page?: number; limit?: number };

export async function health() {
  const [counts] = await query(`SELECT (SELECT COUNT(*) FROM catalog_items) AS catalog_images, (SELECT COUNT(*) FROM recipes WHERE kind = 'ulam') AS ulam_recipes,
    (SELECT COUNT(*) FROM recipes WHERE kind = 'merienda') AS merienda_recipes, (SELECT COUNT(*) FROM catalog_recipes) AS catalog_recipes`);
  return { status: "ok", catalog_images: Number(counts.catalog_images), ulam_recipes: Number(counts.ulam_recipes), merienda_recipes: Number(counts.merienda_recipes), catalog_recipes: Number(counts.catalog_recipes) };
}

export async function listCatalog({ q = "", category = "", recipesOnly = false, rotate = "", page = 1, limit = 24 }: CatalogQuery) {
  const clauses: string[] = [];
  const args: unknown[] = [];
  if (q.trim()) { clauses.push("title LIKE ?"); args.push(`%${q.trim()}%`); }
  if (category) { clauses.push("category = ?"); args.push(category); }
  if (recipesOnly) clauses.push(`(recipe_slug IS NOT NULL OR merienda_slug IS NOT NULL OR ${HAS_CATALOG_RECIPE})`);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM catalog_items ${where}`, args);
  let rows: Row[];
  if (rotate) {
    // Same order for everyone until the day (or week) turns over in Manila.
    const ids = (await query(`SELECT id FROM catalog_items ${where} ORDER BY position`, args)).map((row) => String(row.id));
    const pageIds = shuffled(ids, rotationRandom(rotate, `catalog:${category.toLowerCase()}`)).slice((page - 1) * limit, page * limit);
    const found = pageIds.length ? new Map((await query(`SELECT id, payload, ${HAS_CATALOG_RECIPE} AS has_catalog_recipe FROM catalog_items WHERE id IN (?)`, [pageIds])).map((row) => [String(row.id), row])) : new Map<string, Row>();
    rows = pageIds.map((id) => found.get(id)!);
  } else {
    rows = await query(`SELECT payload, ${HAS_CATALOG_RECIPE} AS has_catalog_recipe FROM catalog_items ${where} ORDER BY position LIMIT ? OFFSET ?`, [...args, limit, (page - 1) * limit]);
  }
  return { items: rows.map((row) => ({ ...withMedia(parseJson(row.payload)), has_catalog_recipe: Boolean(Number(row.has_catalog_recipe)) })), total: Number(total), page, limit };
}

/** Public routes for the sitemap, sourced from the current database. */
export async function seoIndex() {
  const [catalog, ulam, merienda] = await Promise.all([
    query("SELECT image_id FROM catalog_recipes ORDER BY image_id"),
    query("SELECT slug FROM recipes WHERE kind = 'ulam' ORDER BY slug"),
    query("SELECT slug FROM recipes WHERE kind = 'merienda' ORDER BY slug"),
  ]);
  return { catalog_ids: catalog.map((row) => String(row.image_id)), ulam_slugs: ulam.map((row) => String(row.slug)), merienda_slugs: merienda.map((row) => String(row.slug)) };
}

export async function getRecipe(slug: string, kind?: "ulam" | "merienda"): Promise<Json | null> {
  const row = kind ? await one("SELECT payload FROM recipes WHERE slug = ? AND kind = ?", [slug, kind]) : await one("SELECT payload FROM recipes WHERE slug = ?", [slug]);
  return row ? withMedia(parseJson(row.payload)) : null;
}

export async function catalogItem(imageId: string) {
  const row = await one("SELECT payload FROM catalog_items WHERE id = ?", [imageId]);
  if (!row) return null;
  const item = parseJson<{ recipe_slug?: string | null; merienda_slug?: string | null } & Json>(row.payload);
  const [recipe, merienda, catalogRow] = await Promise.all([
    item.recipe_slug ? getRecipe(item.recipe_slug) : null,
    item.merienda_slug ? getRecipe(item.merienda_slug) : null,
    one("SELECT payload FROM catalog_recipes WHERE image_id = ?", [imageId]),
  ]);
  return { ...withMedia(item), recipe, merienda, catalog_recipe: catalogRow ? parseJson(catalogRow.payload) : null };
}

/** Catalog ids are '<manifest id>__<title slug>'; the public URL only carries the slug. */
export async function catalogItemBySlug(slug: string) {
  const escaped = slug.replace(/[%_\\]/g, (match) => `\\${match}`);
  const row = await one("SELECT id FROM catalog_items WHERE id LIKE ?", [`%\\_\\_${escaped}`]);
  return row ? catalogItem(String(row.id)) : null;
}

export async function listRecipes({ q = "", quick = false }: { q?: string; quick?: boolean } = {}) {
  const clauses = ["kind = 'ulam'"];
  const args: unknown[] = [];
  if (q.trim()) { clauses.push("title LIKE ?"); args.push(`%${q.trim()}%`); }
  if (quick) clauses.push("cook_minutes <= 30");
  const items = (await query(`SELECT payload FROM recipes WHERE ${clauses.join(" AND ")} ORDER BY title`, args)).map((row) => withMedia(parseJson(row.payload)));
  return { items, total: items.length };
}

export async function listMerienda() {
  const items = (await query("SELECT payload FROM recipes WHERE kind = 'merienda' ORDER BY title")).map((row) => withMedia(parseJson(row.payload)));
  return { items, total: items.length };
}

export async function listIngredients() {
  const items = (await query("SELECT payload FROM ingredients ORDER BY id")).map((row) => parseJson(row.payload));
  return { items, total: items.length };
}

export async function featuredWeekView(row: { week_start: string; slugs_json: string; updated_at: string | null }) {
  const slugs = parseJson<string[]>(row.slugs_json);
  const recipes = await Promise.all(slugs.map((slug) => getRecipe(slug, "ulam")));
  if (recipes.some((recipe) => !recipe)) throw new HttpError(503, "Featured recipe is unavailable");
  return { week_start: row.week_start, days: recipes.map((recipe, day) => ({ day, recipe })), updated_at: row.updated_at };
}

export async function featuredWeek(weekStart?: string | null) {
  const target = weekStart || weekMonday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target) || Number.isNaN(Date.parse(target))) throw new HttpError(400, "Invalid week date");
  const row = await one("SELECT week_start, slugs_json, updated_at FROM featured_weeks WHERE week_start = ?", [target]);
  if (row) return featuredWeekView(row as never);
  // No week published by an admin: pick seven dishes that stay fixed for that week.
  const slugs = (await query("SELECT slug, payload FROM recipes WHERE kind = 'ulam' ORDER BY slug")).filter((item) => parseJson(item.payload).image).map((item) => String(item.slug));
  if (slugs.length < 7) throw new HttpError(404, "No featured week is available");
  return featuredWeekView({ week_start: target, slugs_json: JSON.stringify(shuffled(slugs, seededRandom(`featured:${target}`)).slice(0, 7)), updated_at: null });
}
