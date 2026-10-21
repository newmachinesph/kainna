import { PriceUpdate, updateIngredientPrice } from "@/server/admin";
import { adminUser } from "@/server/auth";
import { body, route } from "@/server/http";

export const PUT = route(async (request, { params }: RouteContext<"/v1/admin/ingredients/[ingredientId]">) => {
  await adminUser();
  return updateIngredientPrice((await params).ingredientId, await body(request, PriceUpdate));
});
