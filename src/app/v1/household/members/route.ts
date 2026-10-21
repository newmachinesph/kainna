import { householdMembers } from "@/server/account";
import { sessionUser } from "@/server/auth";
import { route } from "@/server/http";

export const GET = route(async () => householdMembers(await sessionUser()));
