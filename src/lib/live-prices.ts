import { listIngredients } from "@/server/catalog";
import type { HouseholdPrice } from "./types";

export async function livePrices(): Promise<HouseholdPrice[]> {
  const data = await listIngredients() as unknown as { items: { id: string; price_php: number; price_updated_at: string }[] };
  if (!data.items.length) throw new Error("Ingredient prices are empty");
  return data.items.map(item => ({ ingredient_id: item.id, price_php: item.price_php, observed_at: item.price_updated_at, source: "market" }));
}
