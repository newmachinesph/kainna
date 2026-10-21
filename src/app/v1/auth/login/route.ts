import { login, LoginRequest } from "@/server/account";
import { body, clientIp, route } from "@/server/http";

export const POST = route(async (request) => login(await body(request, LoginRequest), clientIp(request)));
