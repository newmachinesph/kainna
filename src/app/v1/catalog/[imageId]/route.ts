import { catalogItem } from "@/server/catalog";
import { HttpError, route } from "@/server/http";

export const GET = route(async (_request, { params }: RouteContext<"/v1/catalog/[imageId]">) => {
  const item = await catalogItem((await params).imageId);
  if (!item) throw new HttpError(404, "Image not found");
  return item;
});
