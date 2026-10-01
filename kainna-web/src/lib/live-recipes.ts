import type { Dish } from "./types";

/** Read the current SQLite recipe library for server-generated public plans. */
export async function liveRecipes(): Promise<Dish[]> {
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}/v1/recipes`, {
    cache: "no-store", signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Recipe library unavailable");
  const data = await response.json() as { items: Dish[] };
  if (!data.items.length) throw new Error("Recipe library is empty");
  return data.items;
}
