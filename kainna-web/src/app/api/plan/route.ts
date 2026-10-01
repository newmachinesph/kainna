import { NextResponse } from "next/server";
import type { DayKey, Plan } from "@/lib/types";
import { samplePlan, sampleHousehold } from "@/lib/sample";
import { swapSlot } from "@/lib/engine";
import { DAY_KEYS } from "@/lib/dates";
import { livePrices } from "@/lib/live-prices";
import { liveRecipes } from "@/lib/live-recipes";

/** GET /api/plan?daily=300&size=5 — generate a plan for a synthetic household. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const daily = Number(url.searchParams.get("daily") ?? 300);
  const size = Number(url.searchParams.get("size") ?? 4);
  if (!Number.isFinite(daily) || !Number.isFinite(size) || size < 1 || size > 12) {
    return NextResponse.json({ success: false, data: null, error: "daily and size must be numbers; size 1–12" }, { status: 400 });
  }
  try {
    const [prices, dishes] = await Promise.all([livePrices(), liveRecipes()]);
    const { plan, household } = samplePlan(daily, size, undefined, "NCR", prices, dishes);
    return NextResponse.json({ success: true, data: { plan, household }, error: null });
  } catch { return NextResponse.json({ success: false, data: null, error: "Recipes or prices are unavailable" }, { status: 503 }); }
}

/** POST /api/plan { plan, day, daily, size } — regenerate one slot. */
export async function POST(req: Request) {
  let body: { plan?: Plan; day?: DayKey; daily?: number; size?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, data: null, error: "Invalid JSON" }, { status: 400 }); }
  if (!body.plan || !body.day || !DAY_KEYS.includes(body.day)) return NextResponse.json({ success: false, data: null, error: "plan and day are required" }, { status: 400 });
  try {
    const [prices, dishes] = await Promise.all([livePrices(), liveRecipes()]);
    const household = sampleHousehold(body.daily ?? 300, body.size ?? 4);
    const res = swapSlot(body.plan, body.day, { household, members: [], recentCooked: [], overlay: prices, weekStart: body.plan.week_start, sponsors: [], sponsorsEnabled: false, dishes });
    if (!res) return NextResponse.json({ success: false, data: null, error: "No alternative fits this day" }, { status: 409 });
    return NextResponse.json({ success: true, data: { plan: res.plan, from: res.from, to: res.to }, error: null });
  } catch { return NextResponse.json({ success: false, data: null, error: "Recipes or prices are unavailable" }, { status: 503 }); }
}
