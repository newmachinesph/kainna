import type {
  Dish, HouseholdPrice, Ingredient, Locale, PalengkeGroup, PalengkeGroupList, PalengkeItem, PlanSlot,
} from "./types";
import { PALENGKE_GROUPS } from "./config";
import { peso, qtyLabel, roundToFive } from "./format";
import { translate } from "./i18n";

export interface PriceEntry {
  price: number;
  observed: boolean;
}

export type PriceMap = Map<string, PriceEntry>;

/** Household costing prefers the receipt overlay over the seed table (spec section 5). */
export function buildPriceMap(
  ingredients: Ingredient[],
  overlay: HouseholdPrice[] = [],
  multiplier = 1,
): PriceMap {
  const map: PriceMap = new Map();
  for (const ing of ingredients) {
    map.set(ing.id, { price: ing.price_php * multiplier, observed: false });
  }
  for (const o of overlay) {
    if (map.has(o.ingredient_id)) map.set(o.ingredient_id, { price: o.price_php, observed: o.source === "receipt" });
  }
  return map;
}

export function dishCostPerServing(dish: Dish, prices: PriceMap): number {
  let total = 0;
  for (const di of dish.ingredients) {
    const p = prices.get(di.ingredient_id);
    if (p) total += di.qty * p.price;
  }
  return total / (dish.servings || 4);
}

export function dishCostForHousehold(dish: Dish, prices: PriceMap, size: number): number {
  return roundToFive(dishCostPerServing(dish, prices) * size);
}

/** Round a purchase quantity the way you would actually ask for it at the stall. */
export function purchaseQty(qty: number, unit: string): number {
  if (unit === "kg") return Math.ceil(qty * 20) / 20;
  return Math.ceil(qty - 1e-9);
}

export interface PalengkeList {
  groups: PalengkeGroupList[];
  total: number;
  itemCount: number;
  dishCount: number;
}

export function buildPalengkeList(
  slots: PlanSlot[],
  dishById: Map<string, Dish>,
  ingredients: Ingredient[],
  prices: PriceMap,
  householdSize: number,
): PalengkeList {
  const ingById = new Map(ingredients.map((i) => [i.id, i]));
  const acc = new Map<string, PalengkeItem>();
  for (const slot of slots) {
    const dish = dishById.get(slot.dish_id);
    if (!dish) continue;
    const factor = householdSize / (dish.servings || 4);
    for (const di of dish.ingredients) {
      const ing = ingById.get(di.ingredient_id);
      const p = prices.get(di.ingredient_id);
      if (!ing || !p) continue;
      const qty = di.qty * factor;
      const existing = acc.get(ing.id);
      if (existing) {
        existing.qty += qty;
        existing.cost += qty * p.price;
        if (!existing.dish_ids.includes(dish.id)) existing.dish_ids.push(dish.id);
      } else {
        acc.set(ing.id, {
          ingredient: ing,
          qty,
          cost: qty * p.price,
          dish_ids: [dish.id],
          affiliate_url: ing.affiliate_url,
          observed: p.observed,
        });
      }
    }
  }
  const priced = [...acc.values()].map((item) => {
    const raw = item.cost;
    item.cost = roundToFive(raw);
    return { item, error: raw - item.cost };
  });
  // Keep every shopping line in fives while matching the displayed meal-plan total.
  let adjustment = roundToFive(slots.reduce((sum, slot) => sum + slot.est_cost, 0))
    - priced.reduce((sum, entry) => sum + entry.item.cost, 0);
  if (adjustment && priced.length) {
    priced.sort((a, b) => adjustment > 0 ? b.error - a.error : a.error - b.error);
    let index = 0;
    while (adjustment && index < priced.length * 100) {
      const item = priced[index % priced.length].item;
      if (adjustment > 0) { item.cost += 5; adjustment -= 5; }
      else if (item.cost >= 5) { item.cost -= 5; adjustment += 5; }
      index++;
    }
  }
  const groups: PalengkeGroupList[] = [];
  for (const g of PALENGKE_GROUPS) {
    const items = [...acc.values()]
      .filter((it) => it.ingredient.palengke_group === g)
      .sort((a, b) => b.cost - a.cost);
    if (!items.length) continue;
    groups.push({ group: g, items, subtotal: items.reduce((s, it) => s + it.cost, 0) });
  }
  const total = groups.reduce((s, g) => s + g.subtotal, 0);
  return { groups, total, itemCount: acc.size, dishCount: slots.length };
}

export function groupLabel(group: PalengkeGroup, locale: Locale): string {
  return translate(locale, `group.${group}`);
}

/** Dish and ingredient names stay Filipino in every UI language; the English name is offered as a secondary label. */
export function ingredientName(ing: Ingredient): string {
  return ing.name_tl;
}

export function ingredientAlt(ing: Ingredient, locale: Locale): string | null {
  if (locale !== "en") return null;
  return ing.name_en.toLowerCase() === ing.name_tl.toLowerCase() ? null : ing.name_en;
}

export function dishName(dish: Dish, locale: Locale): string {
  if (locale === "ceb") return dish.name_ceb || dish.name_tl;
  return dish.name_tl;
}

export function dishAlt(dish: Dish, locale: Locale): string | null {
  if (locale !== "en") return null;
  return dish.name_en.toLowerCase() === dish.name_tl.toLowerCase() ? null : dish.name_en;
}

export function palengkeToText(list: PalengkeList, locale: Locale, title: string): string {
  const lines: string[] = [title, ""];
  for (const g of list.groups) {
    lines.push(`${groupLabel(g.group, locale).toUpperCase()}`);
    for (const it of g.items) {
      lines.push(`- ${ingredientName(it.ingredient)}${ingredientAlt(it.ingredient, locale) ? ` (${ingredientAlt(it.ingredient, locale)})` : ""}, ${qtyLabel(purchaseQty(it.qty, it.ingredient.unit), it.ingredient.unit)}: ${peso(it.cost)}`);
    }
    lines.push("");
  }
  lines.push(`${translate(locale, "common.total")}: ${peso(list.total)}`);
  return lines.join("\n");
}
