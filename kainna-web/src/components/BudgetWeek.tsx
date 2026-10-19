"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Share2, Check } from "lucide-react";
import { samplePlan } from "@/lib/sample";
import { planTotal } from "@/lib/engine";
import { buildPalengkeList, buildPriceMap } from "@/lib/costing";
import { DISH_BY_ID, INGREDIENTS } from "@/lib/data";
import { TIERS, BUDGET_PAGE_SIZES, tierByDaily } from "@/lib/config";
import { formatRange } from "@/lib/dates";
import { peso } from "@/lib/format";
import { useT } from "@/lib/useT";
import { useSalo } from "@/store/useSalo";
import { PlanWeek } from "./PlanWeek";
import { BudgetBar } from "./BudgetBar";
import { PalengkeList } from "./PalengkeList";
import { Button, ButtonLink } from "./Button";

export function BudgetWeek({ daily, size, weekStart }: { daily: number; size: number; weekStart: string }) {
  const { t, locale } = useT();
  const hydrated = useSalo((state) => state.hydrated);
  const recipesLoaded = useSalo((state) => state.recipesLoaded);
  const pricesLoaded = useSalo((state) => state.pricesLoaded);
  const prices = useSalo((state) => state.marketPrices);
  const [shared, setShared] = useState(false);
  const sample = useMemo(() => recipesLoaded && pricesLoaded ? samplePlan(daily, size, weekStart, "NCR", prices) : null, [daily, size, weekStart, prices, recipesLoaded, pricesLoaded]);
  const tier = tierByDaily(daily);
  const list = useMemo(() => sample ? buildPalengkeList(sample.plan.slots, DISH_BY_ID, INGREDIENTS, buildPriceMap(INGREDIENTS, prices, tier.price_multiplier), size) : null, [sample, size, tier.price_multiplier, prices]);

  if (!hydrated) return <p className="py-20 text-center text-muted">Loading current recipes and prices…</p>;
  if (!sample || !list) return <p className="py-20 text-center text-muted">Recipes or prices didn&apos;t load. Please refresh the page.</p>;
  const { plan, household } = sample;
  const total = planTotal(plan);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${t("budget.title", { daily: peso(daily), size })}: ${peso(total)}`;
    try {
      if (navigator.share) await navigator.share({ title: "Kain Na!", text, url });
      else await navigator.clipboard.writeText(`${text}\n${url}`);
      setShared(true); setTimeout(() => setShared(false), 1800);
    } catch { /* cancelled */ }
  };

  return (
    <div>
      <div className="pt-6 md:pt-10">
        <div className="text-[13px] text-muted">{t("common.week", { range: formatRange(plan.week_start, locale) })} · {t(`tier.${tier.id}`)}</div>
        <h1 className="mt-1 text-[30px] md:text-[42px]">{t("budget.title", { daily: peso(daily), size })}</h1>
        <p className="mt-2 max-w-[60ch] text-[16px] text-ink-soft">{t("budget.sub", { total: peso(total) })} {t("budget.perPerson", { cost: peso(daily / size) })}.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/onboard">{t("budget.cta")}</ButtonLink>
          <Button variant="secondary" onClick={share}>{shared ? <Check size={16} /> : <Share2 size={16} />} {t("budget.share")}</Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-[13px]">
        {TIERS.map((tr) => (
          <Link key={tr.id} href={`/budget/${tr.daily_php}/${size}`} className={`rounded-full border px-3 py-1 ${tr.daily_php === daily ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-line-strong"}`}>{peso(tr.daily_php)} {t("common.perDay")}</Link>
        ))}
        <span className="w-px bg-line" />
        {BUDGET_PAGE_SIZES.map((n) => (
          <Link key={n} href={`/budget/${daily}/${n}`} className={`rounded-full border px-3 py-1 ${n === size ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-line-strong"}`}>{t("common.people", { n })}</Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-12 md:gap-8">
        <div className="min-w-0 space-y-4 md:col-span-7">
          <BudgetBar spent={total} ceiling={plan.ceiling} note={t("budget.regen")} />
          <PlanWeek plan={plan} household={household} />
        </div>
        <aside className="min-w-0 md:col-span-5">
          <div className="md:sticky md:top-24">
            <PalengkeList list={list} title={`Kain Na! · ${t("budget.title", { daily: peso(daily), size })}`} showDishes={false} priceDate={prices.map(item => item.observed_at).sort().at(-1)} />
          </div>
        </aside>
      </div>

      <section className="mt-12 rounded-[18px] bg-accent p-6 text-white md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[24px] text-white md:text-[30px]">{t("budget.cta")}</h2>
            <p className="mt-1 text-[15px] text-white/80">{t("budget.ctaSub")}</p>
          </div>
          <ButtonLink href="/onboard" size="lg" variant="paper">{t("landing.cta")}</ButtonLink>
        </div>
      </section>
    </div>
  );
}
