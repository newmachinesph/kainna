import { sessionUser } from "@/server/auth";
import { route } from "@/server/http";

export const GET = route(async () => ({ user: await sessionUser() }));
