import { removeMember } from "@/server/account";
import { ownerUser } from "@/server/auth";
import { route } from "@/server/http";

export const DELETE = route(async (_request, { params }: RouteContext<"/v1/household/members/[memberId]">) => removeMember((await params).memberId, await ownerUser()));
