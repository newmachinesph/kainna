import { featuredWeek } from "@/server/catalog";
import { route, searchParams } from "@/server/http";

export const GET = route(async (request) => featuredWeek(searchParams(request).get("week_start")));
