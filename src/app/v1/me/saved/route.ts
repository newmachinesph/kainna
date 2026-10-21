import { listSaved, saveRecipe, SaveRecipe } from "@/server/account";
import { sessionUser } from "@/server/auth";
import { body, route } from "@/server/http";

export const GET = route(async () => listSaved(await sessionUser()));
export const PUT = route(async (request) => {
  const user = await sessionUser();
  return saveRecipe(await body(request, SaveRecipe), user);
});
