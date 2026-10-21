import { GET as catalog } from "@/app/v1/catalog/route";

export async function GET(request: Request) {
  const response = await catalog(request, undefined);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
