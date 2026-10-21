import { getRecipe } from "@/server/catalog";
import { HttpError, route } from "@/server/http";

export const GET = route(async (_request, { params }: RouteContext<"/v1/recipes/[slug]">) => {
  const recipe = await getRecipe((await params).slug, "ulam");
  if (!recipe) throw new HttpError(404, "Recipe not found");
  return recipe;
});
