// Shared domain types. Mirrors the Postgres schema in the spec (section 3),
// flattened for a JSON-backed frontend demo.

export type ProteinClass =
  | "manok"
  | "baboy"
  | "baka"
  | "isda"
  | "hipon"
  | "itlog"
  | "gulay"
  | "delata"
  | "pancit";

export type DietaryFlag =
  | "no_pork"
  | "no_beef"
  | "no_seafood"
  | "no_shellfish"
  | "vegetarian"
  | "low_salt"
  | "diabetic"
  | "no_coconut";

export type PalengkeGroup =
  | "karne"
  | "isda"
  | "gulay"
  | "itlog"
  | "delata"
  | "sangkap";

export type Region =
  | "NCR"
  | "CALABARZON"
  | "Central Luzon"
  | "Ilocos"
  | "Cagayan Valley"
  | "Bicol"
  | "Western Visayas"
  | "Central Visayas"
  | "Eastern Visayas"
  | "Davao"
  | "Northern Mindanao"
  | "Zamboanga"
  | "SOCCSKSARGEN"
  | "CAR"
  | "MIMAROPA"
  | "BARMM"
  | "Caraga";

export type Locale = "tl" | "en" | "ceb";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface Ingredient {
  id: string;
  name_tl: string;
  name_en: string;
  unit: string;
  palengke_group: PalengkeGroup;
  price_php: number;
  price_updated_at: string;
  price_source: string;
  affiliate_url?: string;
}

export interface DishIngredient {
  ingredient_id: string;
  qty: number;
  note?: string;
}

export interface Dish {
  id: string;
  slug: string;
  name_tl: string;
  name_en: string;
  name_ceb: string;
  protein_class: ProteinClass;
  cook_minutes: number;
  base_cost_per_serving: number;
  servings: number;
  dietary_ok_flags: DietaryFlag[];
  leftover_yield: number;
  derived_slug?: string;
  ingredients: DishIngredient[];
  steps_short: string[];
  sponsor_id?: string;
  image?: string | null;
  description_tl: string;
}

export interface BudgetTier {
  id: "tipid" | "sapat" | "maluwag";
  daily_php: number;
  range_php: [number, number];
  price_multiplier: number;
}

export interface Member {
  id: string;
  label: string;
  dietary_flags: DietaryFlag[];
  ayaw_dish_ids: string[];
}

export interface Household {
  id: string;
  name: string;
  size: number;
  budget_tier: BudgetTier["id"];
  region: Region;
  pay_cycle_dates: number[];
  rushed_days: DayKey[];
  locale: Locale;
  email: string;
  viber_opt_in: boolean;
  viber_id?: string;
  messenger_psid?: string;
  created_at: string;
}

export type SlotReason =
  | "rushed"
  | "lean"
  | "leftover_source"
  | "leftover_derived"
  | "sponsored"
  | "variety"
  | "swap";

export interface PlanSlot {
  id: string;
  day: DayKey;
  date: string;
  dish_id: string;
  is_swap: boolean;
  is_sponsored: boolean;
  is_leftover_derived: boolean;
  est_cost: number;
  reasons: SlotReason[];
}

export interface Plan {
  id: string;
  household_id: string;
  week_start: string;
  status: "draft" | "delivered" | "confirmed";
  generated_at: string;
  slots: PlanSlot[];
  ceiling: number;
}

export type CheckinStatus = "as_planned" | "other" | "not_cooked";

export interface Checkin {
  id: string;
  plan_id: string;
  day: DayKey;
  status: CheckinStatus;
  cooked_dish_id: string | null;
  source: "tap" | "receipt";
  receipt_url: string | null;
  created_at: string;
}

export interface Swap {
  id: string;
  plan_slot_id: string;
  from_dish_id: string;
  to_dish_id: string;
  created_at: string;
}

export interface Sponsor {
  id: string;
  brand: string;
  tagline: string;
  dish_ids: string[];
  regions: Region[];
  budget_tiers: BudgetTier["id"][];
  active: boolean;
  impressions: number;
  list_adds: number;
}

export interface HouseholdPrice {
  ingredient_id: string;
  price_php: number;
  observed_at: string;
  source: "receipt" | "market";
}

export type MetricEvent =
  | "plan_delivered"
  | "plan_opened"
  | "swap"
  | "checkin_completed"
  | "checkin_source"
  | "page_visit"
  | "onboard_complete";

export interface MetricLog {
  event: MetricEvent;
  at: string;
  meta?: Record<string, string | number | boolean>;
}

export interface PalengkeItem {
  ingredient: Ingredient;
  qty: number;
  cost: number;
  dish_ids: string[];
  affiliate_url?: string;
  observed?: boolean;
}

export interface PalengkeGroupList {
  group: PalengkeGroup;
  items: PalengkeItem[];
  subtotal: number;
}
