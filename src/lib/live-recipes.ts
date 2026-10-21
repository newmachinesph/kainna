import { listRecipes } from "@/server/catalog";
import type { Dish } from "./types";

/** Read the current recipe library from the database for server-generated public plans. */
export async function liveRecipes(): Promise<Dish[]> {
  const { items } = await listRecipes();
  if (!items.length) throw new Error("Recipe library is empty");
  return items as unknown as Dish[];
}
