import { getRecipe } from "@/server/catalog";

export async function GET(_request: Request, { params }: RouteContext<"/api/dishes/[slug]">) {
  const { slug } = await params;
  try {
    const recipe = await getRecipe(slug, "ulam");
    return Response.json({ success: Boolean(recipe), data: recipe, error: recipe ? null : "Recipe not found" }, { status: recipe ? 200 : 404 });
  } catch { return Response.json({ success: false, data: null, error: "Recipe unavailable" }, { status: 503 }); }
}
