import { CatalogRecipeUpdate, publishCatalogRecipe } from "@/server/admin";
import { adminUser } from "@/server/auth";
import { body, route } from "@/server/http";

export const PUT = route(async (request, { params }: RouteContext<"/v1/admin/catalog/[imageId]/recipe">) => {
  const user = await adminUser();
  return publishCatalogRecipe((await params).imageId, await body(request, CatalogRecipeUpdate), user);
});
