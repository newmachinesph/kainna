import { RecipeUpdate, updateRecipe } from "@/server/admin";
import { adminUser } from "@/server/auth";
import { body, route } from "@/server/http";

export const PUT = route(async (request, { params }: RouteContext<"/v1/admin/recipes/[slug]">) => {
  await adminUser();
  return updateRecipe((await params).slug, await body(request, RecipeUpdate));
});
