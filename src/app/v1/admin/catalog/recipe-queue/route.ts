import { catalogRecipeQueue } from "@/server/admin";
import { adminUser } from "@/server/auth";
import { intParam, route, searchParams } from "@/server/http";

export const GET = route(async (request) => {
  await adminUser();
  const params = searchParams(request);
  return catalogRecipeQueue(params.get("q") ?? "", intParam(params, "page", 1, 1), intParam(params, "limit", 24, 1, 100));
});
