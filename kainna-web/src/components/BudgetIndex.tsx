"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { TIERS, BUDGET_PAGE_SIZES } from "@/lib/config";
import { samplePlan } from "@/lib/sample";
import { planTotal } from "@/lib/engine";
import { peso } from "@/lib/format";
import { useT } from "@/lib/useT";
import { useSalo } from "@/store/useSalo";
import { PageHeader } from "./PageHeader";

export function BudgetIndex({ weekStart }: { weekStart: string }) {
  const { t } = useT();
  const hydrated = useSalo((state) => state.hydrated);
  const recipesLoaded = useSalo((state) => state.recipesLoaded);
  const pricesLoaded = useSalo((state) => state.pricesLoaded);
  const prices = useSalo((state) => state.marketPrices);
  const cells = useMemo(() => recipesLoaded && pricesLoaded ? TIERS.map((tier) => ({ tier, sizes: BUDGET_PAGE_SIZES.map((size) => ({ size, total: planTotal(samplePlan(tier.daily_php, size, weekStart, "NCR", prices).plan) })) })) : [], [weekStart, prices, recipesLoaded, pricesLoaded]);
  if (!hydrated) return <p className="py-20 text-center text-muted">Loading current recipes and prices…</p>;
  if (!recipesLoaded || !pricesLoaded) return <p className="py-20 text-center text-muted">Recipes or prices didn&apos;t load. Please refresh the page.</p>;
  return (
    <div>
      <PageHeader title={t("budget.indexTitle")} sub={t("budget.indexSub")} />
      <div className="grid gap-4 md:grid-cols-3">
        {cells.map(({ tier, sizes }) => (
          <section key={tier.id} className="rounded-[16px] border border-line bg-card p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[24px]">{t(`tier.${tier.id}`)}</h2>
              <div className="peso text-[22px]">{peso(tier.daily_php)}<span className="ml-1 text-[13px] font-normal text-muted">{t("common.perDay")}</span></div>
            </div>
            <p className="mt-1 text-[13px] text-muted">{t("budget.tierRange", { lo: peso(tier.range_php[0]), hi: peso(tier.range_php[1]) })}. {t(`tier.${tier.id}.d`)}</p>
            <ul className="mt-4 divide-y divide-line">
              {sizes.map(({ size, total }) => (
                <li key={size}>
                  <Link href={`/budget/${tier.daily_php}/${size}`} className="group flex items-center justify-between py-2.5 hover:text-accent-deep">
                    <span className="text-[15px]">{t("common.people", { n: size })}</span>
                    <span className="flex items-center gap-2"><span className="peso text-[17px]">{peso(total)}</span><ArrowRight size={15} className="text-muted transition-transform group-hover:translate-x-0.5" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-6 text-[13px] text-muted">{t("budget.regen")} {t("palengke.noRice")}</p>
    </div>
  );
}
