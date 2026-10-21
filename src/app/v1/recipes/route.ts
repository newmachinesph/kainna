import { listRecipes } from "@/server/catalog";
import { boolParam, route, searchParams } from "@/server/http";

export const GET = route(async (request) => {
  const params = searchParams(request);
  return listRecipes({ q: params.get("q") ?? "", quick: boolParam(params, "quick") });
});
