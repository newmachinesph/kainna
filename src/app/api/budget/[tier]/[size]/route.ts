import { NextResponse } from "next/server";
import { samplePlan } from "@/lib/sample";
import { TIERS, BUDGET_PAGE_SIZES, tierByDaily } from "@/lib/config";
import { buildPalengkeList, buildPriceMap } from "@/lib/costing";
import { INGREDIENTS } from "@/lib/data";
import { planTotal } from "@/lib/engine";
import { livePrices } from "@/lib/live-prices";
import { liveRecipes } from "@/lib/live-recipes";

/** GET /api/budget/[tier]/[size] — the public sample week, regenerated weekly. */
export async function GET(_req: Request, { params }: RouteContext<"/api/budget/[tier]/[size]">) {
  const { tier, size } = await params;
  const daily = Number(tier);
  const n = Number(size);
  if (!TIERS.some((t) => t.daily_php === daily) || !BUDGET_PAGE_SIZES.includes(n)) {
    return NextResponse.json({ success: false, data: null, error: "Unknown tier or size" }, { status: 404 });
  }
  try {
    const [prices, dishes] = await Promise.all([livePrices(), liveRecipes()]);
    const { plan, household } = samplePlan(daily, n, undefined, "NCR", prices, dishes);
    const dishById = new Map(dishes.map(dish => [dish.id, dish]));
    const list = buildPalengkeList(plan.slots, dishById, INGREDIENTS, buildPriceMap(INGREDIENTS, prices, tierByDaily(daily).price_multiplier), n);
    return NextResponse.json({ success: true, data: { plan, household, total: planTotal(plan), palengke: list }, error: null });
  } catch { return NextResponse.json({ success: false, data: null, error: "Recipes or prices are unavailable" }, { status: 503 }); }
}
