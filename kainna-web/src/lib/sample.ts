import type { Dish, Household, HouseholdPrice, Plan, Region } from "./types";
import { tierByDaily } from "./config";
import { generatePlan } from "./engine";
import { currentPlanWeek } from "./dates";

/** Synthetic household used by the public /budget pages and the landing sample. */
export function sampleHousehold(daily: number, size: number, region: Region = "NCR"): Household {
  const tier = tierByDaily(daily);
  return {
    id: `sample_${tier.id}_${size}`,
    name: `Sample: ${size} katao`,
    size,
    budget_tier: tier.id,
    region,
    pay_cycle_dates: [15, 30],
    rushed_days: ["tue", "thu"],
    locale: "en",
    email: "",
    viber_opt_in: false,
    created_at: new Date().toISOString(),
  };
}

export function samplePlan(daily: number, size: number, weekStart = currentPlanWeek(), region: Region = "NCR", overlay: HouseholdPrice[] = [], dishes?: Dish[]): { plan: Plan; household: Household } {
  const household = sampleHousehold(daily, size, region);
  const plan = generatePlan({
    household, members: [], recentCooked: [], overlay, weekStart, sponsors: [], sponsorsEnabled: false, dishes,
  });
  return { plan, household };
}
