import { createInvitation, InviteRequest } from "@/server/account";
import { ownerUser } from "@/server/auth";
import { body, created, route } from "@/server/http";

export const POST = route(async (request) => {
  const user = await ownerUser();
  return created(await createInvitation(await body(request, InviteRequest), user));
});
