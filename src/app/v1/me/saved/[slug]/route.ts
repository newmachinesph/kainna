import { removeSaved } from "@/server/account";
import { sessionUser } from "@/server/auth";
import { route } from "@/server/http";

export const DELETE = route(async (_request, { params }: RouteContext<"/v1/me/saved/[slug]">) => removeSaved((await params).slug, await sessionUser()));
