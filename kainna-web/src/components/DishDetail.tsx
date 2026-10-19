"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock, Users, Plus, Check } from "lucide-react";
import type { Dish } from "@/lib/types";
import { DISHES, INGREDIENTS, INGREDIENT_BY_ID, DISH_BY_SLUG, PRICE_DATE, sourceOfDerived } from "@/lib/data";
import { buildPriceMap, dishCostPerServing, dishName, ingredientName, ingredientAlt } from "@/lib/costing";
import { householdCostOf } from "@/lib/engine";
import { DIETARY_FLAGS } from "@/lib/config";
import { dayName, formatDate } from "@/lib/dates";
import { peso, minutes, qtyLabel } from "@/lib/format";
import { useT } from "@/lib/useT";
import { useSalo } from "@/store/useSalo";
import { DishPhoto } from "./DishPhoto";
import { Tag } from "./Tag";
import { Button, ButtonLink } from "./Button";
import { SaveRecipeButton } from "./SaveRecipeButton";
import { QuickAnswers, RecipeFacts, ulamFacts } from "./RecipeFacts";

export function DishDetail({ dish }: { dish: Dish }) {
  const { t, locale } = useT();
  const hydrated = useSalo((s) => s.hydrated);
  const household = useSalo((s) => s.household);
  const overlay = useSalo((s) => s.overlay);
  const marketPrices = useSalo((s) => s.marketPrices);
  const sponsors = useSalo((s) => s.sponsors);
  const sponsorsEnabled = useSalo((s) => s.flags.sponsors_enabled);
  const addDishToPlan = useSalo((s) => s.addDishToPlan);
  const showToast = useSalo((s) => s.showToast);
  const [added, setAdded] = useState<string | null>(null);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);

  const prices = useMemo(() => buildPriceMap(INGREDIENTS, [...marketPrices, ...overlay]), [marketPrices, overlay]);
  const cost = dishCostPerServing(dish, prices);
  const brand = sponsorsEnabled ? sponsors.find((s) => s.active && s.dish_ids.includes(dish.id))?.brand : undefined;
  const derived = dish.derived_slug ? DISH_BY_SLUG.get(dish.derived_slug) : undefined;
  const source = sourceOfDerived(dish);
  const related = DISHES.filter((d) => d.id !== dish.id && d.protein_class === dish.protein_class).slice(0, 4);
  const householdCost = hydrated ? householdCostOf(dish, household, [...marketPrices, ...overlay]) : null;
  const priceDate = marketPrices.map((item) => item.observed_at).sort().at(-1) ?? PRICE_DATE;
  const facts = useMemo(() => ulamFacts(dish, cost, priceDate), [dish, cost, priceDate]);

  const onAdd = () => {
    const day = addDishToPlan(dish.id);
    if (day) { setAdded(day); showToast(t("ulam.addedToPlan", { day: dayName(day, locale) })); }
    else showToast(t("ulam.noSlot"));
  };

  return (
    <article className="pt-4 md:pt-8">
      <div className="grid gap-6 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-6">
          <DishPhoto dish={dish} className="aspect-[4/3] rounded-[18px]" priority />
        </div>
        <div className="md:col-span-6">
          <div className="text-[14px] text-muted">{t(`protein.${dish.protein_class}`)}{dish.name_en !== dish.name_tl ? ` · ${dish.name_en}` : ""}</div>
          <h1 className="mt-1 text-[36px] leading-[1] md:text-[52px]">{dishName(dish, locale)}</h1>
          <p className="mt-3 max-w-[48ch] text-[16px] text-ink-soft">{dish.description_tl}</p>
          <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <div className="peso text-[40px] leading-none">{peso(cost)}</div>
              <div className="mt-1 text-[14px] text-muted">{t("ulam.costNow")}</div>
            </div>
            <div className="flex items-center gap-1.5 text-[15px]"><Clock size={16} className="text-muted" /> {minutes(dish.cook_minutes)}</div>
            <div className="flex items-center gap-1.5 text-[15px]"><Users size={16} className="text-muted" /> Serves {dish.servings}</div>
          </div>
          {householdCost !== null && <div className="mt-3 text-[14px] text-ink-soft">{t("ulam.forHousehold", { size: household.size, cost: peso(householdCost) })}</div>}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {brand && <Tag tone="sponsor">{t("ulam.sponsoredBy", { brand })}</Tag>}
            {derived && <Tag tone="accent">{t("ulam.leftover", { dish: dishName(derived, locale) })}</Tag>}
            {source && <Tag tone="accent">{t("ulam.derivedFrom", { dish: dishName(source, locale) })}</Tag>}
            {dish.cook_minutes <= 30 && <Tag>{t("ulam.quick")}</Tag>}
          </div>
          <div className="mt-3 text-[13px] text-muted">
            {t("ulam.okFor")}: {DIETARY_FLAGS.filter((f) => dish.dietary_ok_flags.includes(f)).map((f) => t(`flag.${f}`)).join(", ") || "—"}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <SaveRecipeButton slug={dish.slug} />
            <ButtonLink href="/onboard">{t("ulam.ctaBtn")}</ButtonLink>
            {hydrated && (
              <Button variant="secondary" onClick={onAdd} disabled={Boolean(added)}>
                {added ? <Check size={16} /> : <Plus size={16} />} {added ? t("ulam.addedToPlan", { day: dayName(added as never, locale) }) : t("ulam.addToPlan")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <RecipeFacts data={facts} />

      <div className="mt-10 grid gap-8 md:grid-cols-12 md:gap-10">
        <section className="md:col-span-5">
          <h2 className="text-[22px]">{t("ulam.ingredients")}</h2>
          <ul className="mt-3 divide-y divide-line rounded-[14px] border border-line bg-card">
            {dish.ingredients.map((di) => {
              const ing = INGREDIENT_BY_ID.get(di.ingredient_id);
              if (!ing) return null;
              const p = prices.get(ing.id)?.price ?? ing.price_php;
              return (
                <li key={di.ingredient_id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
                  <span>{ingredientName(ing)}{ingredientAlt(ing, locale) && <span className="text-muted"> ({ingredientAlt(ing, locale)})</span>} <span className="text-muted">{qtyLabel(di.qty, ing.unit)}</span>{di.note && <span className="text-muted"> · {di.note}</span>}</span>
                  <span className="tnum text-muted">{peso(di.qty * p)}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[13px] text-muted">{t("ulam.priceBasis", { date: formatDate(priceDate, locale, true) })}</p>
        </section>
        <section className="md:col-span-7">
          <div className="flex items-baseline justify-between gap-3"><h2 className="text-[22px]">{t("ulam.steps")}</h2><span className="text-sm text-muted" aria-live="polite">{doneSteps.length}/{dish.steps_short.length} done</span></div>
          <ol className="mt-3 space-y-3">
            {dish.steps_short.map((s, i) => (
              <li key={i}>
                <button type="button" aria-pressed={doneSteps.includes(i)} onClick={() => setDoneSteps((steps) => steps.includes(i) ? steps.filter((step) => step !== i) : [...steps, i])} className="flex w-full gap-3 rounded-xl border border-line bg-card p-4 text-left text-[15px] leading-[1.5] transition-colors hover:border-line-strong">
                  <span className={`display mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] ${doneSteps.includes(i) ? "bg-accent text-white" : "bg-paper-deep"}`}>{doneSteps.includes(i) ? <Check size={15} /> : i + 1}</span>
                  <span className={doneSteps.includes(i) ? "text-muted line-through" : ""}>{s}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <QuickAnswers answers={facts.answers} />

      <section className="mt-12 rounded-[18px] bg-ink p-6 text-paper md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[24px] text-paper md:text-[30px]">{t("ulam.cta")}</h2>
            <p className="mt-1 text-[15px] text-paper/70">{t("ulam.ctaSub")}</p>
          </div>
          <ButtonLink href="/onboard" size="lg" variant="paper">{t("ulam.ctaBtn")}</ButtonLink>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[22px]">{t("ulam.related")}</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((d) => (
              <li key={d.id}>
                <Link href={`/recipes/${d.slug}`} className="block overflow-hidden rounded-[12px] border border-line bg-card hover:border-line-strong">
                  <DishPhoto dish={d} className="aspect-[4/3]" />
                  <div className="flex items-baseline justify-between gap-2 p-2.5"><span className="display truncate text-[15px]">{dishName(d, locale)}</span><span className="peso text-[14px]">{peso(dishCostPerServing(d, prices))}</span></div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
