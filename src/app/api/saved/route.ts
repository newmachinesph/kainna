import { listSaved, removeSaved, saveRecipe, SaveRecipe } from "@/server/account";
import { sessionUser } from "@/server/auth";
import { body, HttpError, route, searchParams } from "@/server/http";

export const GET = route(async () => listSaved(await sessionUser()));
export const PUT = route(async (request) => {
  const user = await sessionUser();
  return saveRecipe(await body(request, SaveRecipe), user);
});
export const DELETE = route(async (request) => {
  const slug = searchParams(request).get("slug");
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new HttpError(400, "Invalid recipe");
  return removeSaved(slug, await sessionUser());
});
