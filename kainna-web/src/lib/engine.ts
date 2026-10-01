import type {
  DayKey, DietaryFlag, Dish, Household, HouseholdPrice, Member, Plan, PlanSlot, ProteinClass, SlotReason, Sponsor,
} from "./types";
import { DISHES, DISH_BY_ID, DISH_BY_SLUG, INGREDIENTS, DERIVED_SLUGS, hashString } from "./data";
import { MAX_PER_PROTEIN_CLASS, RECENT_WINDOW_DAYS, RUSHED_MAX_MINUTES, tierById } from "./config";
import { buildPriceMap, dishCostPerServing, type PriceMap } from "./costing";
import { DAY_KEYS, daysBetween, isLeanDay, weekDates } from "./dates";
import { roundToFive } from "./format";

export interface CookedRecord {
  dish_id: string;
  date: string;
}

export interface EngineInput {
  household: Household;
  members: Member[];
  recentCooked: CookedRecord[];
  overlay: HouseholdPrice[];
  weekStart: string;
  sponsors: Sponsor[];
  sponsorsEnabled: boolean;
  seed?: number;
  dishes?: Dish[];
}

interface DayCtx {
  index: number;
  day: DayKey;
  date: string;
  rushed: boolean;
  lean: boolean;
}

interface Ctx {
  input: EngineInput;
  prices: PriceMap;
  size: number;
  ceiling: number;
  dailyTarget: number;
  days: DayCtx[];
  pool: Dish[];
  dishes: Dish[];
  dishById: Map<string, Dish>;
  dishBySlug: Map<string, Dish>;
  recentClasses: Set<ProteinClass>;
  olderIds: Set<string>;
  sponsorDishIds: Set<string>;
  rng: () => number;
  costOf: (dish: Dish) => number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function planCeiling(household: Household): number {
  return tierById(household.budget_tier).daily_php * 7;
}

export function priceMapFor(household: Household, overlay: HouseholdPrice[] = []): PriceMap {
  return buildPriceMap(INGREDIENTS, overlay, tierById(household.budget_tier).price_multiplier);
}

export function planTotal(plan: Plan): number {
  return plan.slots.reduce((s, x) => s + x.est_cost, 0);
}

/** Rule 1: hard exclude on ayaw and dietary flags of every member. */
export function passesMembers(dish: Dish, members: Member[]): boolean {
  for (const m of members) {
    if (m.ayaw_dish_ids.includes(dish.id)) return false;
    for (const f of m.dietary_flags as DietaryFlag[]) {
      if (!dish.dietary_ok_flags.includes(f)) return false;
    }
  }
  return true;
}

function buildCtx(input: EngineInput, seedBump = 0): Ctx {
  const { household, members, recentCooked, overlay, weekStart } = input;
  const tier = tierById(household.budget_tier);
  const prices = priceMapFor(household, overlay);
  const size = household.size;
  const ceiling = tier.daily_php * 7;
  const seed = (input.seed ?? hashString(household.id + weekStart)) + seedBump;
  const rng = mulberry32(seed);
  const dishes = input.dishes ?? DISHES;
  const dishById = input.dishes ? new Map(dishes.map((dish) => [dish.id, dish])) : DISH_BY_ID;
  const dishBySlug = input.dishes ? new Map(dishes.map((dish) => [dish.slug, dish])) : DISH_BY_SLUG;
  const derivedSlugs = input.dishes ? new Set(dishes.map((dish) => dish.derived_slug).filter(Boolean)) : DERIVED_SLUGS;

  const recentIds = new Set<string>();
  const olderIds = new Set<string>();
  const recentClasses = new Set<ProteinClass>();
  for (const r of recentCooked) {
    const ago = daysBetween(r.date, weekStart);
    if (ago <= RECENT_WINDOW_DAYS && ago > -7) {
      recentIds.add(r.dish_id);
      const d = dishById.get(r.dish_id);
      if (d && ago <= 7) recentClasses.add(d.protein_class);
    } else if (ago <= RECENT_WINDOW_DAYS * 2) {
      olderIds.add(r.dish_id);
    }
  }

  const pool = dishes.filter(
    (d) => passesMembers(d, members) && !recentIds.has(d.id) && !derivedSlugs.has(d.slug),
  );

  const sponsorDishIds = new Set<string>();
  if (input.sponsorsEnabled) {
    for (const s of input.sponsors) {
      if (!s.active) continue;
      if (!s.regions.includes(household.region)) continue;
      if (!s.budget_tiers.includes(household.budget_tier)) continue;
      for (const id of s.dish_ids) if (pool.some((d) => d.id === id)) sponsorDishIds.add(id);
    }
  }

  const days: DayCtx[] = weekDates(weekStart).map(({ day, date }, index) => ({
    index, day, date,
    rushed: household.rushed_days.includes(day),
    lean: isLeanDay(date, household.pay_cycle_dates),
  }));

  const costCache = new Map<string, number>();
  const costOf = (dish: Dish) => {
    let c = costCache.get(dish.id);
    if (c === undefined) {
      c = roundToFive(dishCostPerServing(dish, prices) * size);
      costCache.set(dish.id, c);
    }
    return c;
  };

  return { input, prices, size, ceiling, dailyTarget: ceiling / 7, days, pool, dishes, dishById, dishBySlug, recentClasses, olderIds, sponsorDishIds, rng, costOf };
}

function fitsDay(dish: Dish, day: DayCtx): boolean {
  return !day.rushed || dish.cook_minutes <= RUSHED_MAX_MINUTES;
}

function score(dish: Dish, day: DayCtx, ctx: Ctx, classCount: Map<ProteinClass, number>, sponsoredPlaced: boolean): number {
  const cost = ctx.costOf(dish);
  let s = ctx.rng() * 0.6;
  if (!ctx.recentClasses.has(dish.protein_class)) s += 0.8;
  const used = classCount.get(dish.protein_class) ?? 0;
  s += used === 0 ? 0.6 : -0.5;
  if (ctx.olderIds.has(dish.id)) s -= 0.5;
  const ratio = cost / ctx.dailyTarget;
  if (day.lean) s += (1 - ratio) * 1.6;
  else {
    // Use the budget: reward dishes up to the daily target, penalise well past it.
    s += Math.min(ratio, 1) * 0.7;
    s -= Math.max(0, ratio - 1.25) * 1.2;
  }
  if (ratio > 1.6) s -= 1;
  if (!sponsoredPlaced && ctx.sponsorDishIds.has(dish.id)) s += 2.5;
  return s;
}

interface Working {
  dish: Dish;
  fixed: boolean;
  reasons: SlotReason[];
  is_sponsored: boolean;
  is_leftover_derived: boolean;
}

function chooseLeftoverPair(ctx: Ctx): { index: number; source: Dish; derived: Dish } | null {
  const candidates: { index: number; source: Dish; derived: Dish }[] = [];
  for (const source of ctx.pool) {
    if (source.leftover_yield <= 1 || !source.derived_slug) continue;
    const derived = ctx.dishBySlug.get(source.derived_slug);
    if (!derived || !passesMembers(derived, ctx.input.members)) continue;
    for (let i = 0; i <= 3; i++) {
      const a = ctx.days[i];
      const b = ctx.days[i + 1];
      if (fitsDay(source, a) && fitsDay(derived, b)) candidates.push({ index: i, source, derived });
    }
  }
  if (!candidates.length) return null;
  // Jitter is drawn once per candidate so the comparator stays pure (a random comparator
  // gives browser-dependent results and breaks SSR hydration).
  const keyed = candidates.map((c) => {
    const cost = ctx.costOf(c.source) + ctx.costOf(c.derived);
    const lean = ctx.days[c.index].lean ? cost : 0;
    return { c, k: lean + (ctx.rng() - 0.5) * 60 };
  });
  keyed.sort((x, y) => x.k - y.k);
  candidates.length = 0;
  for (const { c } of keyed) candidates.push(c);
  const affordable = candidates.filter((c) => ctx.costOf(c.source) + ctx.costOf(c.derived) <= ctx.dailyTarget * 2.4);
  const list = affordable.length ? affordable : candidates;
  return list[Math.floor(ctx.rng() * Math.min(list.length, 4))];
}

function solve(ctx: Ctx, ceiling: number): Working[] | null {
  const slots: (Working | null)[] = Array(7).fill(null);
  const pair = chooseLeftoverPair(ctx);
  if (pair) {
    slots[pair.index] = { dish: pair.source, fixed: true, reasons: ["leftover_source"], is_sponsored: false, is_leftover_derived: false };
    slots[pair.index + 1] = { dish: pair.derived, fixed: true, reasons: ["leftover_derived"], is_sponsored: false, is_leftover_derived: true };
  }

  const minCostByDay = ctx.days.map((d) => {
    const fitting = ctx.pool.filter((x) => fitsDay(x, d)).map(ctx.costOf);
    return fitting.length ? Math.min(...fitting) : 0;
  });
  const minRemaining = (from: number) => {
    let s = 0;
    for (let j = from; j < 7; j++) if (!slots[j]) s += minCostByDay[j];
    return s;
  };

  const classCount = new Map<ProteinClass, number>();
  const bump = (c: ProteinClass, n: number) => classCount.set(c, (classCount.get(c) ?? 0) + n);
  let spent = 0;
  for (let i = 0; i < 7; i++) {
    const w = slots[i];
    if (w && !w.is_leftover_derived) bump(w.dish.protein_class, 1);
    if (w) spent += ctx.costOf(w.dish);
  }

  const used = new Set<string>(slots.filter(Boolean).map((w) => (w as Working).dish.id));
  const sponsoredPlaced = () => slots.some((w) => w?.is_sponsored);

  const fill = (i: number): boolean => {
    if (i === 7) return true;
    if (slots[i]) return fill(i + 1);
    const day = ctx.days[i];
    const prev = slots[i - 1]?.dish.protein_class;
    const next = slots[i + 1]?.dish.protein_class;
    const placed = sponsoredPlaced();
    const cands = ctx.pool
      .filter((d) => !used.has(d.id) && fitsDay(d, day))
      .filter((d) => d.protein_class !== prev && d.protein_class !== next)
      .filter((d) => (classCount.get(d.protein_class) ?? 0) < MAX_PER_PROTEIN_CLASS)
      .filter((d) => spent + ctx.costOf(d) + minRemaining(i + 1) <= ceiling)
      .map((d) => ({ d, s: score(d, day, ctx, classCount, placed) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 8);
    for (const { d } of cands) {
      const sponsored = !placed && ctx.sponsorDishIds.has(d.id);
      const reasons: SlotReason[] = [];
      if (day.rushed) reasons.push("rushed");
      if (day.lean) reasons.push("lean");
      if (sponsored) reasons.push("sponsored");
      if (!reasons.length) reasons.push("variety");
      slots[i] = { dish: d, fixed: false, reasons, is_sponsored: sponsored, is_leftover_derived: false };
      used.add(d.id);
      bump(d.protein_class, 1);
      spent += ctx.costOf(d);
      if (fill(i + 1)) return true;
      spent -= ctx.costOf(d);
      bump(d.protein_class, -1);
      used.delete(d.id);
      slots[i] = null;
    }
    return false;
  };

  if (!fill(0)) return null;
  return slots.map((w, i) => {
    const s = w as Working;
    const day = ctx.days[i];
    if (s.fixed) {
      if (day.rushed) s.reasons.push("rushed");
      if (day.lean) s.reasons.push("lean");
    }
    return s;
  });
}

function toPlan(ctx: Ctx, working: Working[]): Plan {
  const { household, weekStart } = ctx.input;
  const slots: PlanSlot[] = working.map((w, i) => ({
    id: `${household.id}_${weekStart}_${ctx.days[i].day}`,
    day: ctx.days[i].day,
    date: ctx.days[i].date,
    dish_id: w.dish.id,
    is_swap: false,
    is_sponsored: w.is_sponsored,
    is_leftover_derived: w.is_leftover_derived,
    est_cost: ctx.costOf(w.dish),
    reasons: w.reasons,
  }));
  return {
    id: `plan_${household.id}_${weekStart}`,
    household_id: household.id,
    week_start: weekStart,
    status: "delivered",
    generated_at: new Date().toISOString(),
    slots,
    ceiling: ctx.ceiling,
  };
}

/** Rotation engine (spec section 4): greedy day by day with backtracking, relaxing the ceiling only if nothing fits. */
export function generatePlan(input: EngineInput, seedBump = 0): Plan {
  const ctx = buildCtx(input, seedBump);
  for (const relax of [1, 1.1, 1.25, 1.5, 100]) {
    const w = solve(ctx, ctx.ceiling * relax);
    if (w) return toPlan(ctx, w);
  }
  // Last resort: cheapest fitting dish per day (only reachable with extreme dietary combos).
  const fallback: Working[] = ctx.days.map((d) => {
    const c = ctx.pool.filter((x) => fitsDay(x, d)).sort((a, b) => ctx.costOf(a) - ctx.costOf(b))[0] ?? ctx.dishes[0];
    return { dish: c, fixed: false, reasons: ["variety"], is_sponsored: false, is_leftover_derived: false };
  });
  return toPlan(ctx, fallback);
}

function candidatesFor(plan: Plan, day: DayKey, ctx: Ctx, excludeIds: string[]): { dish: Dish; cost: number; s: number }[] {
  const idx = DAY_KEYS.indexOf(day);
  const slot = plan.slots[idx];
  const dayCtx = ctx.days[idx];
  const others = plan.slots.filter((_, i) => i !== idx);
  const used = new Set(others.map((s) => s.dish_id));
  const prev = idx > 0 ? ctx.dishById.get(plan.slots[idx - 1].dish_id)?.protein_class : undefined;
  const next = idx < 6 ? ctx.dishById.get(plan.slots[idx + 1].dish_id)?.protein_class : undefined;
  const classCount = new Map<ProteinClass, number>();
  for (const s of others) {
    const d = ctx.dishById.get(s.dish_id);
    if (d && !s.is_leftover_derived) classCount.set(d.protein_class, (classCount.get(d.protein_class) ?? 0) + 1);
  }
  const remaining = ctx.ceiling - (planTotal(plan) - slot.est_cost);
  const base = ctx.pool
    .filter((d) => d.id !== slot.dish_id && !used.has(d.id) && !excludeIds.includes(d.id) && fitsDay(d, dayCtx))
    .filter((d) => d.protein_class !== prev && d.protein_class !== next)
    .filter((d) => (classCount.get(d.protein_class) ?? 0) < MAX_PER_PROTEIN_CLASS);
  const within = base.filter((d) => ctx.costOf(d) <= remaining);
  const list = within.length ? within : base;
  return list
    .map((d) => ({ dish: d, cost: ctx.costOf(d), s: score(d, dayCtx, ctx, classCount, true) + (within.length ? 0 : -ctx.costOf(d) / ctx.dailyTarget) }))
    .sort((a, b) => b.s - a.s);
}

export function alternativesForSlot(plan: Plan, day: DayKey, input: EngineInput, n = 5, excludeIds: string[] = []): { dish: Dish; cost: number }[] {
  const ctx = buildCtx(input, hashString(plan.id + day + excludeIds.length));
  return candidatesFor(plan, day, ctx, excludeIds).slice(0, n).map(({ dish, cost }) => ({ dish, cost }));
}

export function setSlotDish(plan: Plan, day: DayKey, dishId: string, input: EngineInput): Plan {
  const ctx = buildCtx(input);
  const idx = DAY_KEYS.indexOf(day);
  const dish = ctx.dishById.get(dishId);
  if (!dish) return plan;
  const dayCtx = ctx.days[idx];
  const reasons: SlotReason[] = ["swap"];
  if (dayCtx.rushed) reasons.push("rushed");
  if (dayCtx.lean) reasons.push("lean");
  const old = plan.slots[idx];
  const slots = plan.slots.map((s, i) =>
    i === idx
      ? { ...s, dish_id: dish.id, is_swap: true, is_sponsored: false, is_leftover_derived: false, est_cost: ctx.costOf(dish), reasons }
      : s,
  );
  let next: Plan = { ...plan, slots };
  // Breaking a leftover pair: the derived meal no longer has its source, so re-pick it too.
  if (old.reasons.includes("leftover_source") && idx < 6 && plan.slots[idx + 1].is_leftover_derived) {
    const derivedDay = DAY_KEYS[idx + 1];
    const cleared = { ...next, slots: next.slots.map((s, i) => (i === idx + 1 ? { ...s, is_leftover_derived: false, reasons: s.reasons.filter((r) => r !== "leftover_derived") } : s)) };
    const r = swapSlot(cleared, derivedDay, input, []);
    next = r ? r.plan : cleared;
  }
  return next;
}

/** One-tap swap: regenerate a single slot within all constraints. */
export function swapSlot(plan: Plan, day: DayKey, input: EngineInput, excludeIds: string[] = []): { plan: Plan; from: string; to: string } | null {
  const ctx = buildCtx(input, hashString(plan.id + day + excludeIds.join(",")));
  const idx = DAY_KEYS.indexOf(day);
  const cands = candidatesFor(plan, day, ctx, excludeIds);
  if (!cands.length) return null;
  const pick = cands[Math.floor(ctx.rng() * Math.min(3, cands.length))];
  const from = plan.slots[idx].dish_id;
  const next = setSlotDish(plan, day, pick.dish.id, input);
  return { plan: next, from, to: pick.dish.id };
}

export function eligibleDishes(input: EngineInput): Dish[] {
  return buildCtx(input).pool;
}

/** The first day this dish could take this week, respecting neighbours and rushed nights. Used by "add to plan". */
export function firstFittingDay(plan: Plan, dish: Dish, input: EngineInput): DayKey | null {
  const ctx = buildCtx(input);
  if (!passesMembers(dish, input.members)) return null;
  for (let i = 0; i < 7; i++) {
    const dayCtx = ctx.days[i];
    if (!fitsDay(dish, dayCtx)) continue;
    const prev = i > 0 ? ctx.dishById.get(plan.slots[i - 1].dish_id)?.protein_class : undefined;
    const next = i < 6 ? ctx.dishById.get(plan.slots[i + 1].dish_id)?.protein_class : undefined;
    if (dish.protein_class === prev || dish.protein_class === next) continue;
    if (plan.slots[i].dish_id === dish.id) return null;
    if (plan.slots[i].is_leftover_derived || plan.slots[i].reasons.includes("leftover_source")) continue;
    return DAY_KEYS[i];
  }
  return null;
}

export function householdCostOf(dish: Dish, household: Household, overlay: HouseholdPrice[] = []): number {
  return roundToFive(dishCostPerServing(dish, priceMapFor(household, overlay)) * household.size);
}
