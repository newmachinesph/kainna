import { getRecipe } from "@/server/catalog";
import { HttpError, route } from "@/server/http";

export const GET = route(async (_request, { params }: RouteContext<"/v1/merienda/[slug]">) => {
  const recipe = await getRecipe((await params).slug, "merienda");
  if (!recipe) throw new HttpError(404, "Recipe not found");
  return recipe;
});
