"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw, Undo2, Check } from "lucide-react";
import { useSalo } from "@/store/useSalo";
import { useT } from "@/lib/useT";
import { DISH_BY_ID, INGREDIENTS } from "@/lib/data";
import { alternativesForSlot, planTotal, priceMapFor } from "@/lib/engine";
import { buildPalengkeList, dishName } from "@/lib/costing";
import { dayName, formatRange } from "@/lib/dates";
import { peso, minutes } from "@/lib/format";
import { tierById } from "@/lib/config";
import type { DayKey } from "@/lib/types";
import { PageHeader, Skeleton } from "./PageHeader";
import { PlanWeek } from "./PlanWeek";
import { BudgetBar } from "./BudgetBar";
import { PalengkeList } from "./PalengkeList";
import { Sheet } from "./Sheet";
import { Button, ButtonLink } from "./Button";
import { DishPhoto } from "./DishPhoto";
import { Tag } from "./Tag";
import { SampleNotice, useSamplePlan } from "./SamplePlan";

export function PlanPage() {
  const { t, locale } = useT();
  const hydrated = useSalo((s) => s.hydrated);
  const recipesLoaded = useSalo((s) => s.recipesLoaded);
  const pricesLoaded = useSalo((s) => s.pricesLoaded);
  const savedPlan = useSalo((s) => s.plan);
  const savedHousehold = useSalo((s) => s.household);
  const overlay = useSalo((s) => s.overlay);
  const marketPrices = useSalo((s) => s.marketPrices);
  const bought = useSalo((s) => s.bought);
  const toggleBought = useSalo((s) => s.toggleBought);
  const swap = useSalo((s) => s.swap);
  const pickDish = useSalo((s) => s.pickDish);
  const regenerate = useSalo((s) => s.regenerate);
  const showToast = useSalo((s) => s.showToast);
  const log = useSalo((s) => s.log);
  const engineInput = useSalo((s) => s.engineInput);
  const sample = useSamplePlan();
  // Visitors without a plan get a read-only sample so the tool is not an empty page.
  const isSample = !savedPlan;
  const plan = savedPlan ?? sample.plan;
  const household = savedPlan ? savedHousehold : sample.household;

  const [pickDay, setPickDay] = useState<DayKey | null>(null);
  const [swappingDay, setSwappingDay] = useState<DayKey | null>(null);
  const [lastSwap, setLastSwap] = useState<{ day: DayKey; from: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (hydrated) log("plan_opened"); }, [hydrated, log]);
  useEffect(() => {
    if (!lastSwap) return;
    const id = setTimeout(() => setLastSwap(null), 8000);
    return () => clearTimeout(id);
  }, [lastSwap]);

  const prices = useMemo(() => priceMapFor(household, [...marketPrices, ...overlay]), [household, marketPrices, overlay]);
  const list = useMemo(() => buildPalengkeList(plan.slots, DISH_BY_ID, INGREDIENTS, prices, household.size), [plan, prices, household.size]);
  const alternatives = useMemo(() => (pickDay ? alternativesForSlot(plan, pickDay, engineInput(), 6) : []), [plan, pickDay, engineInput]);

  if (!hydrated) return <div className="pt-8"><Skeleton /></div>;
  if (!recipesLoaded || !pricesLoaded) return <p className="py-20 text-center text-muted">Recipes or prices are unavailable. Start the local API and refresh this page.</p>;
  const total = planTotal(plan);
  const tier = tierById(household.budget_tier);

  const onSwap = (day: DayKey) => {
    const r = swap(day);
    if (!r) { showToast(t("plan.noAlternatives")); return; }
    setLastSwap({ day, from: r.from });
    setSwappingDay(day);
    setTimeout(() => setSwappingDay(null), 300);
    showToast(t("plan.swapDone", { day: dayName(day, locale), dish: dishName(DISH_BY_ID.get(r.to)!, locale) }));
  };

  const copyPlan = async () => {
    const lines = [`${household.name} · ${formatRange(plan.week_start, locale)}`, ...plan.slots.map((s) => t("viber.line", { day: dayName(s.day, locale, true), dish: dishName(DISH_BY_ID.get(s.dish_id)!, locale), cost: peso(s.est_cost) })), t("viber.total", { total: peso(total) })];
    try { await navigator.clipboard.writeText(lines.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 1800); showToast("toast.copied"); } catch { /* clipboard blocked */ }
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("plan.for", { name: household.name })}
        title={t("plan.title")}
        sub={t("common.week", { range: formatRange(plan.week_start, locale) })}
        right={isSample ? undefined :
          <>
            <Button variant="secondary" size="sm" onClick={copyPlan}>{copied ? <Check size={15} /> : <Copy size={15} />} {t("plan.copyPlan")}</Button>
            <Button variant="ink" size="sm" onClick={regenerate}><RefreshCw size={15} /> {t("plan.regen")}</Button>
          </>
        }
      />

      {isSample && <SampleNotice />}
      <div className="grid gap-6 md:grid-cols-12 md:gap-8">
        <div className="min-w-0 space-y-4 md:col-span-7">
          <BudgetBar spent={total} ceiling={plan.ceiling} note={t("plan.ceilingNote", { tier: t(`tier.${tier.id}`), daily: peso(tier.daily_php), size: household.size })} />
          {total > plan.ceiling && <div className="rounded-[12px] bg-warn-soft px-4 py-3 text-[14px] text-warn">{t("plan.overBudget")}</div>}
          {lastSwap && (
            <div className="flex items-center justify-between gap-3 rounded-[12px] border border-line bg-card px-4 py-2.5 text-[14px]">
              <span>{t("toast.swapped", { day: dayName(lastSwap.day, locale) })}</span>
              <button type="button" onClick={() => { pickDish(lastSwap.day, lastSwap.from); setLastSwap(null); }} className="inline-flex items-center gap-1 font-medium text-accent-deep"><Undo2 size={14} /> {t("common.undo")}</button>
            </div>
          )}
          <PlanWeek plan={plan} household={household} interactive={!isSample} onSwap={onSwap} onPick={setPickDay} swappingDay={swappingDay} />
          {!isSample && <p className="text-[13px] text-muted">{t("plan.tapSwap")}</p>}
        </div>
        <aside className="min-w-0 md:col-span-5">
          <div className="md:sticky md:top-24">
            <PalengkeList
              list={list}
              bought={isSample ? [] : bought}
              onToggle={isSample ? undefined : toggleBought}
              title={`${household.name} · ${formatRange(plan.week_start, locale)}`}
              onCopied={() => showToast("toast.copied")}
              priceDate={marketPrices.map(item => item.observed_at).sort().at(-1)}
              showDishes={false}
            />
            <div className="mt-3 text-center md:hidden"><ButtonLink href="/palengke" variant="secondary" size="sm">{t("plan.viewPalengke")}</ButtonLink></div>
          </div>
        </aside>
      </div>

      <Sheet open={pickDay !== null} onClose={() => setPickDay(null)} title={pickDay ? t("plan.alternatives", { day: dayName(pickDay, locale) }) : ""}>
        {alternatives.length === 0 ? (
          <p className="text-[14px] text-muted">{t("plan.noAlternatives")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {alternatives.map(({ dish, cost }) => (
              <li key={dish.id}>
                <button type="button" onClick={() => { if (pickDay) { pickDish(pickDay, dish.id); showToast(t("plan.swapDone", { day: dayName(pickDay, locale), dish: dishName(dish, locale) })); } setPickDay(null); }} className="flex w-full items-center gap-3 py-3 text-left hover:bg-paper">
                  <DishPhoto dish={dish} className="h-14 w-16 shrink-0 rounded-[8px]" />
                  <div className="min-w-0 flex-1">
                    <div className="display truncate text-[17px]">{dishName(dish, locale)}</div>
                    <div className="text-[13px] text-muted">{minutes(dish.cook_minutes)} · {t(`protein.${dish.protein_class}`)}</div>
                  </div>
                  <div className="text-right">
                    <div className="peso text-[18px]">{peso(cost)}</div>
                    {cost + total - plan.slots[["mon","tue","wed","thu","fri","sat","sun"].indexOf(pickDay!)].est_cost > plan.ceiling && <Tag tone="warn">{t("plan.over", { amount: peso(cost + total - plan.slots[["mon","tue","wed","thu","fri","sat","sun"].indexOf(pickDay!)].est_cost - plan.ceiling) })}</Tag>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 text-[13px] text-muted"><Link href="/recipes" className="underline underline-offset-4">{t("nav.ulam")}</Link></div>
      </Sheet>

    </div>
  );
}
