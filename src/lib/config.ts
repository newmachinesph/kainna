import type { BudgetTier, DietaryFlag, PalengkeGroup, ProteinClass, Region } from "./types";

export const TIERS: BudgetTier[] = [
  { id: "tipid", daily_php: 200, range_php: [150, 250], price_multiplier: 0.95 },
  { id: "sapat", daily_php: 300, range_php: [250, 400], price_multiplier: 1 },
  { id: "maluwag", daily_php: 500, range_php: [400, 650], price_multiplier: 1.08 },
];

export function tierById(id: BudgetTier["id"]): BudgetTier {
  return TIERS.find((t) => t.id === id) ?? TIERS[1];
}

export function tierByDaily(daily: number): BudgetTier {
  return TIERS.find((t) => t.daily_php === daily) ?? TIERS[1];
}

export const REGIONS: Region[] = [
  "NCR", "CALABARZON", "Central Luzon", "Ilocos", "Cagayan Valley", "CAR", "MIMAROPA", "Bicol",
  "Western Visayas", "Central Visayas", "Eastern Visayas", "Zamboanga", "Northern Mindanao",
  "Davao", "SOCCSKSARGEN", "Caraga", "BARMM",
];

export const DIETARY_FLAGS: DietaryFlag[] = [
  "no_pork", "no_beef", "no_seafood", "no_shellfish", "vegetarian", "low_salt", "diabetic", "no_coconut",
];

export const PROTEIN_CLASSES: ProteinClass[] = [
  "manok", "baboy", "baka", "isda", "hipon", "itlog", "gulay", "delata", "pancit",
];

export const PALENGKE_GROUPS: PalengkeGroup[] = ["karne", "isda", "gulay", "itlog", "delata", "sangkap"];

export const HOUSEHOLD_SIZES = [2, 3, 4, 5, 6, 8];
export const BUDGET_PAGE_SIZES = [3, 4, 5, 6];

export const FEATURE_FLAGS_DEFAULT = {
  viber_enabled: true,
  messenger_enabled: true,
  sponsors_enabled: true,
  ceb_enabled: false,
};

export type FeatureFlags = typeof FEATURE_FLAGS_DEFAULT;

export const RECENT_WINDOW_DAYS = 14;
export const MAX_PER_PROTEIN_CLASS = 2;
export const RUSHED_MAX_MINUTES = 30;