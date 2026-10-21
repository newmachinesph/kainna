import { z } from "zod";
import type { User } from "./auth";
import { featuredWeekView, getRecipe } from "./catalog";
import { one, query } from "./db";
import { HttpError } from "./http";
import { manilaDate, nowIso, parseJson, roundPrice, withMedia, type Json } from "./util";

export const FeaturedWeekRequest = z.object({ slugs: z.array(z.string()).length(7) });
export const PriceUpdate = z.object({ price_php: z.number().gt(0).lte(1_000_000), price_source: z.string().min(2).max(120) });
export const RecipeUpdate = z.object({
  name_tl: z.string().min(2).max(120),
  name_en: z.string().min(2).max(120),
  description_tl: z.string().min(10).max(2000),
  cook_minutes: z.number().int().gt(0).lte(1440),
  steps_short: z.array(z.string()).min(1).max(30),
});
export const CatalogRecipeUpdate = z.object({
  intro: z.string().min(20).max(2000),
  minutes: z.number().int().gt(0).lte(1440),
  servings: z.number().int().gt(0).lte(40),
  ingredients: z.array(z.string()).min(2).max(60),
  steps: z.array(z.string()).min(2).max(40),
});

const UNPUBLISHED = "recipe_slug IS NULL AND merienda_slug IS NULL AND NOT EXISTS (SELECT 1 FROM catalog_recipes cr WHERE cr.image_id = catalog_items.id)";

export async function publishFeaturedWeek(weekStart: string, payload: z.infer<typeof FeaturedWeekRequest>, user: User) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(weekStart) ? new Date(`${weekStart}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== weekStart) throw new HttpError(400, "Use a YYYY-MM-DD Monday date");
  if (parsed.getUTCDay() !== 1) throw new HttpError(400, "Featured weeks must start on Monday");
  if (new Set(payload.slugs).size !== 7) throw new HttpError(400, "Choose seven different recipes");
  for (const slug of payload.slugs) {
    const recipe = await getRecipe(slug, "ulam");
    if (!recipe?.image) throw new HttpError(400, `Recipe has no available image: ${slug}`);
  }
  await query(`INSERT INTO featured_weeks (week_start, slugs_json, updated_by, updated_at) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE slugs_json = VALUES(slugs_json), updated_by = VALUES(updated_by), updated_at = VALUES(updated_at)`, [weekStart, JSON.stringify(payload.slugs), user.id, nowIso()]);
  return featuredWeekView((await one("SELECT week_start, slugs_json, updated_at FROM featured_weeks WHERE week_start = ?", [weekStart])) as never);
}

export async function updateIngredientPrice(ingredientId: string, payload: z.infer<typeof PriceUpdate>) {
  const row = await one("SELECT payload FROM ingredients WHERE id = ?", [ingredientId]);
  if (!row) throw new HttpError(404, "Ingredient not found");
  const item = { ...parseJson(row.payload), price_php: roundPrice(payload.price_php), price_source: payload.price_source, price_updated_at: manilaDate() };
  await query("UPDATE ingredients SET payload = ? WHERE id = ?", [JSON.stringify(item), ingredientId]);
  return item;
}

export async function catalogRecipeQueue(q: string, page: number, limit: number) {
  let where = UNPUBLISHED;
  const args: unknown[] = [];
  if (q.trim()) { where += " AND title LIKE ?"; args.push(`%${q.trim()}%`); }
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM catalog_items WHERE ${where}`, args);
  const items = await query(`SELECT payload FROM catalog_items WHERE ${where} ORDER BY position LIMIT ? OFFSET ?`, [...args, limit, (page - 1) * limit]);
  return { items: items.map((row) => withMedia(parseJson(row.payload))), total: Number(total), page, limit };
}

export async function publishCatalogRecipe(imageId: string, payload: z.infer<typeof CatalogRecipeUpdate>, user: User) {
  const ingredients = payload.ingredients.map((value) => value.trim());
  const steps = payload.steps.map((value) => value.trim());
  if (ingredients.some((value) => value.length < 3 || value.length > 300)) throw new HttpError(400, "Each ingredient must be 3–300 characters");
  if (steps.some((value) => value.length < 10 || value.length > 1000)) throw new HttpError(400, "Each step must be 10–1000 characters");
  const row = await one("SELECT payload FROM catalog_items WHERE id = ?", [imageId]);
  if (!row) throw new HttpError(404, "Catalog image not found");
  const recipe = { title: parseJson(row.payload).title, intro: payload.intro.trim(), minutes: payload.minutes, servings: payload.servings, ingredients, steps };
  await query(`INSERT INTO catalog_recipes (image_id, payload, updated_by, updated_at) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_by = VALUES(updated_by), updated_at = VALUES(updated_at)`, [imageId, JSON.stringify(recipe), user.id, nowIso()]);
  return { image_id: imageId, recipe };
}

export async function updateRecipe(slug: string, payload: z.infer<typeof RecipeUpdate>) {
  const steps = payload.steps_short.map((step) => step.trim());
  if (steps.some((step) => step.length < 3 || step.length > 500)) throw new HttpError(400, "Each step must be 3–500 characters");
  const row = await one("SELECT payload FROM recipes WHERE slug = ? AND kind = 'ulam'", [slug]);
  if (!row) throw new HttpError(404, "Recipe not found");
  const item: Json = { ...parseJson(row.payload), name_tl: payload.name_tl.trim(), name_en: payload.name_en.trim(), description_tl: payload.description_tl.trim(), cook_minutes: payload.cook_minutes, steps_short: steps };
  await query("UPDATE recipes SET title = ?, cook_minutes = ?, payload = ? WHERE slug = ?", [item.name_tl, item.cook_minutes, JSON.stringify(item), slug]);
  return withMedia(item);
}
