"use client";
import Link from "next/link";
import { RefreshCw, ChevronDown } from "lucide-react";
import type { Checkin, Household, Plan, PlanSlot, SlotReason } from "@/lib/types";
import { DISH_BY_ID } from "@/lib/data";
import { dayName, formatDate, isToday, nextPayday } from "@/lib/dates";
import { peso, cn, minutes } from "@/lib/format";
import { dishName, dishAlt } from "@/lib/costing";
import { useT } from "@/lib/useT";
import { DishPhoto } from "./DishPhoto";
import { Tag } from "./Tag";

interface Props {
  plan: Plan;
  household: Household;
  interactive?: boolean;
  onSwap?: (day: PlanSlot["day"]) => void;
  onPick?: (day: PlanSlot["day"]) => void;
  checkins?: Checkin[];
  compact?: boolean;
  swappingDay?: PlanSlot["day"] | null;
  sponsorBrand?: (dishId: string) => string | undefined;
}

export function reasonTag(reason: SlotReason, t: (k: string, v?: Record<string, string | number>) => string, payday: string) {
  switch (reason) {
    case "rushed": return { text: t("plan.rushed"), tone: "neutral" as const };
    case "lean": return { text: t("plan.lean", { payday }), tone: "accent" as const };
    case "leftover_source": return { text: t("plan.leftoverSource"), tone: "accent" as const };
    case "leftover_derived": return { text: t("plan.leftoverDerived"), tone: "accent" as const };
    case "sponsored": return { text: t("plan.sponsored"), tone: "sponsor" as const };
    case "swap": return { text: t("plan.swapped"), tone: "ink" as const };
    default: return null;
  }
}

export function PlanWeek({ plan, household, interactive, onSwap, onPick, checkins, compact, swappingDay, sponsorBrand }: Props) {
  const { t, locale } = useT();
  return (
    <ol className="divide-y divide-line rounded-[16px] border border-line bg-card">
      {plan.slots.map((slot) => {
        const dish = DISH_BY_ID.get(slot.dish_id);
        if (!dish) return null;
        const payday = formatDate(nextPayday(slot.date, household.pay_cycle_dates), locale);
        const today = isToday(slot.date);
        const ck = checkins?.find((c) => c.day === slot.day);
        const brand = slot.is_sponsored && sponsorBrand ? sponsorBrand(slot.dish_id) : undefined;
        const tags = slot.reasons.map((r) => reasonTag(r, t, payday)).filter(Boolean) as { text: string; tone: "neutral" | "accent" | "sponsor" | "ink" }[];
        return (
          <li key={slot.id} className={cn("relative flex items-stretch gap-3 p-3 md:gap-5 md:p-4", swappingDay === slot.day && "pop")}>
            <div className={cn("flex w-11 shrink-0 flex-col justify-start pt-1 md:w-20 md:justify-center md:pt-0", today && "text-accent")}>
              <span className={cn("daymark", compact ? "text-[20px] md:text-[32px]" : "text-[22px] md:text-[40px]")}>{dayName(slot.day, locale, true)}</span>
              <span className="tnum mt-1 text-[13px] text-muted md:text-[13px]">{formatDate(slot.date, locale)}</span>
            </div>
            <Link href={`/recipes/${dish.slug}`} className={cn("shrink-0 self-start overflow-hidden rounded-[10px]", compact ? "h-16 w-16 md:h-20 md:w-24" : "h-[72px] w-[72px] md:h-24 md:w-32")}>
              <DishPhoto dish={dish} className="h-full w-full" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/recipes/${dish.slug}`} className={cn("display block truncate hover:underline", compact ? "text-[17px] md:text-[19px]" : "text-[18px] md:text-[22px]")}>
                    {dishName(dish, locale)}
                  </Link>
                  {dishAlt(dish, locale) && <div className="truncate text-[13px] text-ink-soft">{dishAlt(dish, locale)}</div>}
                  <div className="tnum mt-0.5 truncate text-[13px] text-muted">
                    {minutes(dish.cook_minutes)} · {t(`protein.${dish.protein_class}`)}
                    {brand ? ` · ${t("ulam.sponsoredBy", { brand })}` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={cn("peso", compact ? "text-[18px] md:text-[20px]" : "text-[20px] md:text-[24px]")}>{peso(slot.est_cost)}</div>
                  <div className="tnum whitespace-nowrap text-[13px] text-muted">{peso(slot.est_cost / household.size)} {t("common.each")}</div>
                </div>
              </div>
              {(tags.length > 0 || ck) && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {tags.map((tag) => <Tag key={tag.text} tone={tag.tone}>{tag.text}</Tag>)}
                  {ck && <Tag tone={ck.status === "as_planned" ? "accent" : ck.status === "other" ? "neutral" : "warn"}>{t(ck.status === "as_planned" ? "checkin.asPlanned" : ck.status === "other" ? "checkin.other" : "checkin.notCooked")}</Tag>}
                </div>
              )}
              {interactive && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSwap?.(slot.day)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-paper px-3 text-[13px] font-medium text-ink hover:border-accent hover:text-accent-deep"
                  >
                    <RefreshCw size={13} /> {t("common.swap")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onPick?.(slot.day)}
                    className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-[13px] text-muted hover:text-ink"
                    aria-label={t("plan.pickDish")}
                  >
                    {t("common.choose")} <ChevronDown size={13} />
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}