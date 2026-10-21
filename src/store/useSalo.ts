"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Checkin, CheckinStatus, DayKey, Household, HouseholdPrice, Locale, Member, MetricEvent, MetricLog, Plan, Sponsor, Swap,
} from "@/lib/types";
import { FEATURE_FLAGS_DEFAULT, type FeatureFlags } from "@/lib/config";
import { firstFittingDay, generatePlan, priceMapFor, setSlotDish, swapSlot, type CookedRecord, type EngineInput } from "@/lib/engine";
import { dishCostForHousehold } from "@/lib/costing";
import { addDays, currentPlanWeek, DAY_KEYS, todayISO } from "@/lib/dates";
import { DISH_BY_ID } from "@/lib/data";
import { uid } from "@/lib/format";

export interface HistoryEntry {
  plan: Plan;
  checkins: Checkin[];
}

export interface ReceiptPrice {
  ingredient_id: string;
  price_php: number;
}

export interface SaloState {
  hydrated: boolean;
  locale: Locale;
  onboarded: boolean;
  household: Household;
  members: Member[];
  plan: Plan | null;
  history: HistoryEntry[];
  checkins: Checkin[];
  swaps: Swap[];
  overlay: HouseholdPrice[];
  marketPrices: HouseholdPrice[];
  pricesLoaded: boolean;
  recipesLoaded: boolean;
  sponsors: Sponsor[];
  flags: FeatureFlags;
  metrics: MetricLog[];
  bought: string[];
  swapTried: Record<string, string[]>;
  toast: { id: number; text: string } | null;
  installDismissed: boolean;
  seedBump: number;

  setHydrated: () => void;
  setLocale: (l: Locale) => void;
  setMarketPrices: (prices: HouseholdPrice[]) => void;
  setRecipesLoaded: () => void;
  refreshPlanCosts: () => void;
  engineInput: () => EngineInput;
  recentCooked: () => CookedRecord[];
  saveHousehold: (h: Household, members: Member[]) => void;
  completeOnboarding: (h: Household, members: Member[]) => void;
  regenerate: () => void;
  rolloverIfNeeded: () => void;
  swap: (day: DayKey) => { from: string; to: string } | null;
  pickDish: (day: DayKey, dishId: string) => void;
  addDishToPlan: (dishId: string) => DayKey | null;
  checkin: (day: DayKey, status: CheckinStatus, cookedDishId?: string | null, source?: "tap" | "receipt") => void;
  applyReceipt: (prices: ReceiptPrice[], cooked: { day: DayKey; dish_id: string }[]) => void;
  toggleBought: (ingredientId: string) => void;
  toggleSponsor: (id: string) => void;
  updateSponsor: (id: string, patch: Partial<Sponsor>) => void;
  addSponsor: (s: Sponsor) => void;
  setFlag: (k: keyof FeatureFlags, v: boolean) => void;
  log: (event: MetricEvent, meta?: MetricLog["meta"]) => void;
  showToast: (text: string) => void;
  clearToast: () => void;
  dismissInstall: () => void;
  resetDemo: () => void;
}

function baseState() {
  return {
    hydrated: false,
    locale: "en" as Locale,
    onboarded: false,
    household: { id: "guest", name: "My table", size: 1, budget_tier: "sapat", region: "NCR", pay_cycle_dates: [15, 30], rushed_days: [], locale: "en", email: "", viber_opt_in: false, created_at: new Date().toISOString() } as Household,
    members: [] as Member[],
    plan: null as Plan | null,
    history: [] as HistoryEntry[],
    checkins: [] as Checkin[],
    swaps: [] as Swap[],
    overlay: [] as HouseholdPrice[],
    marketPrices: [] as HouseholdPrice[],
    pricesLoaded: false,
    recipesLoaded: false,
    sponsors: [] as Sponsor[],
    flags: { ...FEATURE_FLAGS_DEFAULT, sponsors_enabled: false },
    metrics: [] as MetricLog[],
    bought: [] as string[],
    swapTried: {} as Record<string, string[]>,
    toast: null,
    installDismissed: false,
    seedBump: 0,
  };
}

let toastSeq = 1;

export const useSalo = create<SaloState>()(
  persist(
    (set, get) => ({
      ...baseState(),

      setHydrated: () => set({ hydrated: true }),
      setLocale: (locale) => set({ locale }),
      setMarketPrices: (marketPrices) => { set({ marketPrices, pricesLoaded: marketPrices.length > 0 }); get().refreshPlanCosts(); },
      setRecipesLoaded: () => set({ recipesLoaded: true }),
      refreshPlanCosts: () => {
        const state = get();
        if (!state.plan) return;
        const prices = priceMapFor(state.household, [...state.marketPrices, ...state.overlay]);
        const slots = state.plan.slots.map((slot) => {
          const dish = DISH_BY_ID.get(slot.dish_id);
          return dish ? { ...slot, est_cost: dishCostForHousehold(dish, prices, state.household.size) } : slot;
        });
        if (slots.some((slot, index) => slot.est_cost !== state.plan!.slots[index].est_cost)) set({ plan: { ...state.plan, slots } });
      },

      recentCooked: () => {
        const out: CookedRecord[] = [];
        for (const h of get().history) {
          for (const c of h.checkins) {
            if (c.cooked_dish_id) out.push({ dish_id: c.cooked_dish_id, date: addDays(h.plan.week_start, DAY_KEYS.indexOf(c.day)) });
          }
        }
        return out;
      },

      engineInput: () => {
        const s = get();
        return {
          household: s.household,
          members: s.members,
          recentCooked: s.recentCooked(),
          overlay: [...s.marketPrices, ...s.overlay],
          weekStart: s.plan?.week_start ?? currentPlanWeek(),
          sponsors: s.sponsors,
          sponsorsEnabled: s.flags.sponsors_enabled,
          seed: undefined,
        };
      },

      saveHousehold: (household, members) => {
        set({ household, members });
        get().refreshPlanCosts();
        get().showToast("toast.saved");
      },

      completeOnboarding: (household, members) => {
        const weekStart = currentPlanWeek();
        const input: EngineInput = {
          household, members, recentCooked: [], overlay: get().marketPrices, weekStart,
          sponsors: get().sponsors, sponsorsEnabled: get().flags.sponsors_enabled,
        };
        const plan = generatePlan(input);
        set({ household, members, plan, history: [], checkins: [], swaps: [], overlay: [], bought: [], swapTried: {}, onboarded: true, seedBump: 0 });
        get().log("onboard_complete");
        get().log("plan_delivered");
      },

      regenerate: () => {
        const s = get();
        if (!s.recipesLoaded || !s.pricesLoaded) { s.showToast("Recipes or prices are unavailable. Refresh and try again."); return; }
        const bump = s.seedBump + 1;
        const plan = generatePlan({ ...s.engineInput(), weekStart: currentPlanWeek() }, bump);
        set({ plan, seedBump: bump, bought: [], swapTried: {}, checkins: [] });
        s.log("plan_delivered");
        s.showToast("toast.regen");
      },

      rolloverIfNeeded: () => {
        const s = get();
        if (!s.onboarded) return;
        if (!s.recipesLoaded || !s.pricesLoaded) return;
        const week = currentPlanWeek();
        if (s.plan && s.plan.week_start === week) return;
        const history = s.plan ? [...s.history, { plan: { ...s.plan, status: "confirmed" as const }, checkins: s.checkins }] : s.history;
        const plan = generatePlan({ ...s.engineInput(), weekStart: week });
        set({ plan, history, checkins: [], bought: [], swapTried: {} });
      },

      swap: (day) => {
        const s = get();
        if (!s.recipesLoaded || !s.pricesLoaded) return null;
        if (!s.plan) return null;
        const tried = s.swapTried[day] ?? [];
        const current = s.plan.slots[DAY_KEYS.indexOf(day)].dish_id;
        const res = swapSlot(s.plan, day, s.engineInput(), [...tried, current]);
        if (!res) return null;
        const swap: Swap = { id: uid("sw"), plan_slot_id: s.plan.slots[DAY_KEYS.indexOf(day)].id, from_dish_id: res.from, to_dish_id: res.to, created_at: new Date().toISOString() };
        set({ plan: res.plan, swaps: [...s.swaps, swap], swapTried: { ...s.swapTried, [day]: [...tried, current] } });
        s.log("swap", { day });
        return { from: res.from, to: res.to };
      },

      pickDish: (day, dishId) => {
        const s = get();
        if (!s.recipesLoaded || !s.pricesLoaded) return;
        if (!s.plan) return;
        const from = s.plan.slots[DAY_KEYS.indexOf(day)].dish_id;
        const plan = setSlotDish(s.plan, day, dishId, s.engineInput());
        const swap: Swap = { id: uid("sw"), plan_slot_id: s.plan.slots[DAY_KEYS.indexOf(day)].id, from_dish_id: from, to_dish_id: dishId, created_at: new Date().toISOString() };
        set({ plan, swaps: [...s.swaps, swap] });
        s.log("swap", { day, picked: true });
      },

      addDishToPlan: (dishId) => {
        const s = get();
        const dish = DISH_BY_ID.get(dishId);
        if (!s.plan || !dish) return null;
        const day = firstFittingDay(s.plan, dish, s.engineInput());
        if (!day) return null;
        s.pickDish(day, dishId);
        return day;
      },

      checkin: (day, status, cookedDishId, source = "tap") => {
        const s = get();
        if (!s.plan) return;
        const slot = s.plan.slots[DAY_KEYS.indexOf(day)];
        const cooked = status === "as_planned" ? slot.dish_id : status === "other" ? cookedDishId ?? null : null;
        const entry: Checkin = {
          id: uid("ck"), plan_id: s.plan.id, day, status, cooked_dish_id: cooked, source,
          receipt_url: null, created_at: new Date().toISOString(),
        };
        const checkins = [...s.checkins.filter((c) => c.day !== day), entry];
        set({ checkins });
        s.log("checkin_source", { source });
        if (checkins.length === 7) s.log("checkin_completed");
      },

      applyReceipt: (prices, cooked) => {
        const s = get();
        const today = todayISO();
        const overlay = [...s.overlay.filter((o) => !prices.some((p) => p.ingredient_id === o.ingredient_id)),
          ...prices.map((p) => ({ ingredient_id: p.ingredient_id, price_php: p.price_php, observed_at: today, source: "receipt" as const }))];
        set({ overlay });
        get().refreshPlanCosts();
        for (const c of cooked) {
          const slot = s.plan?.slots[DAY_KEYS.indexOf(c.day)];
          if (!slot) continue;
          s.checkin(c.day, slot.dish_id === c.dish_id ? "as_planned" : "other", c.dish_id, "receipt");
        }
      },

      toggleBought: (ingredientId) => {
        const b = get().bought;
        set({ bought: b.includes(ingredientId) ? b.filter((x) => x !== ingredientId) : [...b, ingredientId] });
      },

      toggleSponsor: (id) => set({ sponsors: get().sponsors.map((sp) => (sp.id === id ? { ...sp, active: !sp.active } : sp)) }),
      updateSponsor: (id, patch) => set({ sponsors: get().sponsors.map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)) }),
      addSponsor: (sp) => set({ sponsors: [...get().sponsors, sp] }),
      setFlag: (k, v) => set({ flags: { ...get().flags, [k]: v } }),

      log: (event, meta) => set({ metrics: [...get().metrics, { event, at: new Date().toISOString(), meta }] }),

      showToast: (text) => set({ toast: { id: toastSeq++, text } }),
      clearToast: () => set({ toast: null }),
      dismissInstall: () => set({ installDismissed: true }),

      resetDemo: () => {
        set({ ...baseState(), hydrated: true, locale: get().locale, marketPrices: get().marketPrices, pricesLoaded: get().pricesLoaded, recipesLoaded: get().recipesLoaded });
        get().showToast("toast.reset");
      },
    }),
    {
      name: "salo-guest-v1",
      version: 2,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<SaloState>;
        return version < 2 ? { ...state, locale: "en" as Locale } : state;
      },
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        locale: s.locale, onboarded: s.onboarded, household: s.household, members: s.members, plan: s.plan, history: s.history,
        checkins: s.checkins, swaps: s.swaps, overlay: s.overlay, sponsors: s.sponsors, flags: s.flags, metrics: s.metrics,
        bought: s.bought, swapTried: s.swapTried, installDismissed: s.installDismissed, seedBump: s.seedBump,
      }),
    },
  ),
);
