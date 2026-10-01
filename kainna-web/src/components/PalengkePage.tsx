"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useSalo } from "@/store/useSalo";
import { useT } from "@/lib/useT";
import { DISH_BY_ID, INGREDIENTS } from "@/lib/data";
import { planTotal, priceMapFor } from "@/lib/engine";
import { buildPalengkeList, dishName } from "@/lib/costing";
import { formatRange, dayName } from "@/lib/dates";
import { peso } from "@/lib/format";
import { PageHeader, Empty, Skeleton } from "./PageHeader";
import { PalengkeList } from "./PalengkeList";
import { ButtonLink } from "./Button";

export function PalengkePage() {
  const { t, locale } = useT();
  const hydrated = useSalo((s) => s.hydrated);
  const recipesLoaded = useSalo((s) => s.recipesLoaded);
  const pricesLoaded = useSalo((s) => s.pricesLoaded);
  const plan = useSalo((s) => s.plan);
  const household = useSalo((s) => s.household);
  const overlay = useSalo((s) => s.overlay);
  const marketPrices = useSalo((s) => s.marketPrices);
  const bought = useSalo((s) => s.bought);
  const toggleBought = useSalo((s) => s.toggleBought);
  const showToast = useSalo((s) => s.showToast);
  const list = useMemo(() => (plan ? buildPalengkeList(plan.slots, DISH_BY_ID, INGREDIENTS, priceMapFor(household, [...marketPrices, ...overlay]), household.size) : null), [plan, household, marketPrices, overlay]);

  if (!hydrated) return <div className="pt-8"><Skeleton rows={5} /></div>;
  if (!recipesLoaded || !pricesLoaded) return <p className="py-20 text-center text-muted">Recipes or prices are unavailable. Start the local API and refresh this page.</p>;
  if (!plan || !list) return <div className="pt-10"><Empty title={t("empty.noPlan")} sub={t("empty.noPlanSub")} action={<ButtonLink href="/plan">{t("empty.makePlan")}</ButtonLink>} /></div>;

  return (
    <div>
      <PageHeader
        eyebrow={`${household.name} · ${formatRange(plan.week_start, locale)}`}
        title={t("palengke.title")}
        sub={t("palengke.sub", { n: plan.slots.length })}
        right={<div className="peso text-[28px]">{peso(list.total)}</div>}
      />
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {plan.slots.map((s) => {
          const d = DISH_BY_ID.get(s.dish_id);
          return d ? (
            <Link key={s.id} href={`/recipes/${d.slug}`} className="shrink-0 rounded-full border border-line bg-card px-3 py-1 text-[13px] hover:border-line-strong">
              <span className="text-muted">{dayName(s.day, locale, true)}</span> {dishName(d, locale)}
            </Link>
          ) : null;
        })}
      </div>
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8">
          <PalengkeList list={list} bought={bought} onToggle={toggleBought} title={`${household.name} · ${formatRange(plan.week_start, locale)}`} onCopied={() => showToast("toast.copied")} priceDate={marketPrices.map(item => item.observed_at).sort().at(-1)} />
        </div>
        <aside className="md:col-span-4">
          <div className="rounded-[16px] border border-line bg-card p-4 text-[14px] md:sticky md:top-20">
            <div className="text-muted">{t("common.total")} ({t("nav.plan")})</div>
            <div className="peso text-[26px]">{peso(planTotal(plan))}</div>
            <div className="mt-2 text-[13px] text-muted">{t("palengke.noRice")}</div>
            <div className="mt-4"><ButtonLink href="/plan" variant="secondary" size="sm">{t("nav.plan")}</ButtonLink></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
