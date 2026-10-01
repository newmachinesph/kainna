import ingredientsJson from "@/data/ingredients.json";
import dishesJson from "@/data/dishes.json";
import type { Dish, Ingredient } from "./types";

export const INGREDIENTS = ingredientsJson as Ingredient[];
export const DISHES = dishesJson as Dish[];

export const INGREDIENT_BY_ID = new Map(INGREDIENTS.map((i) => [i.id, i]));
export const DISH_BY_ID = new Map(DISHES.map((d) => [d.id, d]));
export const DISH_BY_SLUG = new Map(DISHES.map((d) => [d.slug, d]));

/** Dishes that only appear as the planned second meal of a leftover-yielding dish. */
export const DERIVED_SLUGS = new Set(DISHES.map((d) => d.derived_slug).filter(Boolean) as string[]);

/** Refresh the planner's in-memory recipe index from the SQLite-backed API. */
export function replaceDishes(items: Dish[]): void {
  DISHES.splice(0, DISHES.length, ...items);
  DISH_BY_ID.clear();
  DISH_BY_SLUG.clear();
  DERIVED_SLUGS.clear();
  for (const dish of items) {
    DISH_BY_ID.set(dish.id, dish);
    DISH_BY_SLUG.set(dish.slug, dish);
    if (dish.derived_slug) DERIVED_SLUGS.add(dish.derived_slug);
  }
}

export function dishBySlug(slug: string): Dish | undefined {
  return DISH_BY_SLUG.get(slug);
}

export function dishById(id: string): Dish | undefined {
  return DISH_BY_ID.get(id);
}

export function isDerivedOnly(dish: Dish): boolean {
  return DERIVED_SLUGS.has(dish.slug);
}

export function sourceOfDerived(dish: Dish): Dish | undefined {
  return DISHES.find((d) => d.derived_slug === dish.slug);
}

export const PRICE_DATE = INGREDIENTS[0]?.price_updated_at ?? "2026-08-28";
export const PRICE_SOURCE = INGREDIENTS[0]?.price_source ?? "DA Bantay Presyo";


export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
