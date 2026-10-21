import { listIngredients } from "@/server/catalog";

export async function GET() {
  try {
    const data = await listIngredients();
    return Response.json({ success: true, data: data.items, error: null, meta: { total: data.total } });
  } catch { return Response.json({ success: false, data: [], error: "Ingredients unavailable" }, { status: 503 }); }
}
