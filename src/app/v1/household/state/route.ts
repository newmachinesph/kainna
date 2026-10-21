import { householdState, HouseholdStateRequest, saveHouseholdState } from "@/server/account";
import { sessionUser } from "@/server/auth";
import { body, route } from "@/server/http";

export const GET = route(async () => householdState(await sessionUser()));
export const PUT = route(async (request) => {
  const user = await sessionUser();
  return saveHouseholdState(await body(request, HouseholdStateRequest), user);
});
