import { catalogItemBySlug } from "@/server/catalog";
import { HttpError, route } from "@/server/http";

export const GET = route(async (_request, { params }: RouteContext<"/v1/catalog/slug/[slug]">) => {
  const item = await catalogItemBySlug((await params).slug);
  if (!item) throw new HttpError(404, "Image not found");
  return item;
});
