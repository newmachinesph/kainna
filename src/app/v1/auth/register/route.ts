import { register, RegisterRequest } from "@/server/account";
import { body, clientIp, created, route } from "@/server/http";

export const POST = route(async (request) => created(await register(await body(request, RegisterRequest), clientIp(request))));
