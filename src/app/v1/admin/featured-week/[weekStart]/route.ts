import { FeaturedWeekRequest, publishFeaturedWeek } from "@/server/admin";
import { adminUser } from "@/server/auth";
import { body, route } from "@/server/http";

export const PUT = route(async (request, { params }: RouteContext<"/v1/admin/featured-week/[weekStart]">) => {
  const user = await adminUser();
  return publishFeaturedWeek((await params).weekStart, await body(request, FeaturedWeekRequest), user);
});
