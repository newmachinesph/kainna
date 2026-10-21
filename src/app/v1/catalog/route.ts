import { listCatalog } from "@/server/catalog";
import { boolParam, HttpError, intParam, route, searchParams } from "@/server/http";

export const GET = route(async (request) => {
  const params = searchParams(request);
  const rotate = params.get("rotate") ?? "";
  if (rotate !== "" && rotate !== "daily" && rotate !== "weekly") throw new HttpError(422, "rotate must be daily or weekly");
  return listCatalog({ q: params.get("q") ?? "", category: params.get("category") ?? "", recipesOnly: boolParam(params, "recipes_only"), rotate, page: intParam(params, "page", 1, 1), limit: intParam(params, "limit", 24, 1, 100) });
});
