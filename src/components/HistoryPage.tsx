"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useSalo } from "@/store/useSalo";
import { useT } from "@/lib/useT";
import { DISH_BY_ID } from "@/lib/data";
import { dishName } from "@/lib/costing";
import { addDays, DAY_KEYS, dayName, daysBetween, formatRange } from "@/lib/dates";
import { peso } from "@/lib/format";
import { PageHeader, Skeleton } from "./PageHeader";
import { Tag } from "./Tag";
import { DishPhoto } from "./DishPhoto";

export function HistoryPage() {
  const { t, locale } = useT();
  const hydrated = useSalo((s) => s.hydrated);
  const recipesLoaded = useSalo((s) => s.recipesLoaded);
  const history = useSalo((s) => s.history);
  const plan = useSalo((s) => s.plan);
  const checkins = useSalo((s) => s.checkins);
  const excluded = useMemo(() => {
    if (!plan) return [];
    const out = new Map<string, string>();
    for (const h of history) for (const c of h.checkins) {
      if (!c.cooked_dish_id) continue;
      const date = addDays(h.plan.week_start, DAY_KEYS.indexOf(c.day));
      if (daysBetween(date, plan.week_start) <= 14) out.set(c.cooked_dish_id, date);
    }
    return [...out.entries()];
  }, [history, plan]);

  if (!hydrated) return <div className="pt-8"><Skeleton rows={3} /></div>;
  if (!recipesLoaded) return <p className="py-20 text-center text-muted">Recipes are unavailable. Start the local API and refresh this page.</p>;
  const weeks = [...history].reverse();
  const completedWeeks = history.filter((entry) => entry.checkins.length === 7).length + (plan && checkins.length === 7 ? 1 : 0);

  return (
    <div>
      <PageHeader title={t("history.title")} sub={t("history.sub")} />
      <div className="grid gap-8 md:grid-cols-12">
        <div className="min-w-0 space-y-4 md:col-span-8">
          {weeks.map(({ plan: p, checkins }) => {
            const asPlanned = checkins.filter((c) => c.status === "as_planned").length;
            const spent = p.slots.reduce((s, slot) => { const c = checkins.find((x) => x.day === slot.day); if (!c || c.status === "not_cooked") return s; return s + slot.est_cost; }, 0);
            return (
              <section key={p.id} className="rounded-[16px] border border-line bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
                  <div>
                    <h2 className="text-[20px]">{t("common.week", { range: formatRange(p.week_start, locale) })}</h2>
                    <div className="text-[13px] text-muted">{t("history.cookedAsPlanned", { n: asPlanned })} · {checkins.length === 7 ? t("history.completed") : `${checkins.length}/7`}</div>
                  </div>
                  <div className="text-right"><div className="text-[13px] text-muted">{t("history.spent")}</div><div className="peso text-[22px]">{peso(spent)}</div></div>
                </div>
                <ul className="divide-y divide-line">
                  {p.slots.map((slot) => {
                    const dish = DISH_BY_ID.get(slot.dish_id)!;
                    const ck = checkins.find((c) => c.day === slot.day);
                    const cooked = ck?.cooked_dish_id ? DISH_BY_ID.get(ck.cooked_dish_id) : undefined;
                    return (
                      <li key={slot.id} className="flex items-center gap-3 px-4 py-2.5 text-[14px]">
                        <span className="daymark w-10 text-[20px] text-muted">{dayName(slot.day, locale, true)}</span>
                        <DishPhoto dish={cooked ?? dish} className="h-9 w-11 rounded-[6px]" />
                        <span className="min-w-0 flex-1 truncate">{cooked && cooked.id !== dish.id ? <>{dishName(cooked, locale)} <span className="text-muted line-through">{dishName(dish, locale)}</span></> : dishName(dish, locale)}</span>
                        {ck && <Tag tone={ck.status === "as_planned" ? "accent" : ck.status === "other" ? "neutral" : "warn"}>{t(ck.status === "as_planned" ? "checkin.asPlanned" : ck.status === "other" ? "checkin.other" : "checkin.notCooked")}</Tag>}
                        {ck?.source === "receipt" && <Tag>{t("checkin.viaReceipt")}</Tag>}
                        <span className="tnum w-16 text-right text-muted">{peso(slot.est_cost)}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        <aside className="space-y-6 md:col-span-4">
          <section className="rounded-[16px] border border-line bg-card p-4">
            <h2 className="text-[18px]">{t("history.excluded")}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {excluded.map(([id]) => { const d = DISH_BY_ID.get(id); return d ? <Link key={id} href={`/recipes/${d.slug}`}><Tag>{dishName(d, locale)}</Tag></Link> : null; })}
            </div>
          </section>
          <section className="rounded-[16px] border border-line bg-card p-4">
            <h2 className="text-[18px]">{t("history.metricsTitle")}</h2>
            <p className="mt-1 text-[13px] text-muted">{t("history.metricsSub")}</p>
            <div className="mt-3 flex items-baseline gap-2"><span className="display text-[40px] leading-none">{completedWeeks}</span><span className="text-[13px] text-muted">{t("history.completedWeeks")}</span></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
