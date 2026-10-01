import type { HouseholdPrice } from "./types";

export async function livePrices(): Promise<HouseholdPrice[]> {
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}/v1/ingredients`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Current ingredient prices are unavailable");
  const data = await response.json() as { items: { id: string; price_php: number; price_updated_at: string }[] };
  if (!data.items.length) throw new Error("Ingredient prices are empty");
  return data.items.map(item => ({ ingredient_id: item.id, price_php: item.price_php, observed_at: item.price_updated_at, source: "market" }));
}
