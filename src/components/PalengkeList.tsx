"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { PalengkeList as ListType } from "@/lib/costing";
import { groupLabel, ingredientName, ingredientAlt, palengkeToText, purchaseQty } from "@/lib/costing";
import { peso, qtyLabel, cn } from "@/lib/format";
import { DISH_BY_ID, PRICE_DATE } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { useT } from "@/lib/useT";
import { Button } from "./Button";
import { dishName } from "@/lib/costing";

interface Props {
  list: ListType;
  bought?: string[];
  onToggle?: (ingredientId: string) => void;
  title: string;
  onCopied?: () => void;
  showDishes?: boolean;
  priceDate?: string;
}

export function PalengkeList({ list, bought = [], onToggle, title, onCopied, showDishes = true, priceDate = PRICE_DATE }: Props) {
  const { t, locale } = useT();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(palengkeToText(list, locale, title));
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const interactive = Boolean(onToggle);
  return (
    <div className="rounded-[16px] border border-line bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-line p-4">
        <div>
          <h2 className="text-[20px]">{t("palengke.title")}</h2>
          <p className="text-[13px] text-muted">{t("palengke.sub", { n: list.dishCount })}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={copy} aria-live="polite">
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? t("common.copied") : t("palengke.copy")}
        </Button>
      </div>
      {interactive && <p className="px-4 pt-3 text-[13px] text-muted">{t("palengke.check")} · {t("palengke.bought", { done: bought.length, total: list.itemCount })}</p>}
      {list.groups.map((g) => (
        <section key={g.group} className="border-b border-line last:border-b-0">
          <div className="flex items-baseline justify-between px-4 pt-4 pb-1">
            <h3 className="text-[16px]">{groupLabel(g.group, locale)}</h3>
            <span className="tnum text-[13px] text-muted">{peso(g.subtotal)}</span>
          </div>
          <ul>
            {g.items.map((it) => {
              const done = bought.includes(it.ingredient.id);
              const name = ingredientName(it.ingredient);
              const alt = ingredientAlt(it.ingredient, locale);
              const qty = qtyLabel(purchaseQty(it.qty, it.ingredient.unit), it.ingredient.unit);
              const body = (
                <>
                  <div className="min-w-0 flex-1">
                    <div className={cn("flex flex-wrap items-baseline gap-x-2", done && "text-muted line-through")}>
                      <span className="font-medium">{name}</span>
                      {alt && <span className="text-[13px] text-muted">{alt}</span>}
                      <span className="tnum text-[13px] text-muted">{qty}</span>
                      {it.observed && <span className="rounded-full bg-accent-soft px-1.5 text-[12px] text-accent-deep no-underline">{t("palengke.observed")}</span>}
                    </div>
                    {showDishes && (
                      <div className="truncate text-[13px] text-muted">
                        {t("palengke.forDish")} {it.dish_ids.map((id) => DISH_BY_ID.get(id)).filter(Boolean).map((d) => dishName(d!, locale)).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("tnum text-[15px]", done && "text-muted")}>{peso(it.cost)}</span>
                  </div>
                </>
              );
              return (
                <li key={it.ingredient.id}>
                  {interactive ? (
                    <button
                      type="button"
                      onClick={() => onToggle?.(it.ingredient.id)}
                      aria-pressed={done}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-paper"
                    >
                      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", done ? "border-accent bg-accent text-white" : "border-line-strong bg-card")}>
                        {done && <Check size={13} />}
                      </span>
                      {body}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div className="flex items-center justify-between border-t border-line p-4">
        <div>
          <div className="text-[13px] text-muted">{t("palengke.running")}</div>
          <div className="text-[13px] text-muted">{t("palengke.noRice")} {t("palengke.priceNote", { date: formatDate(priceDate, locale, true) })}</div>
        </div>
        <div className="peso text-[26px]">{peso(list.total)}</div>
      </div>
    </div>
  );
}
