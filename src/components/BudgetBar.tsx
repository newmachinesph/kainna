"use client";
import { peso, cn } from "@/lib/format";
import { useT } from "@/lib/useT";

export function BudgetBar({ spent, ceiling, note, className }: { spent: number; ceiling: number; note?: string; className?: string }) {
  const { t } = useT();
  const over = spent > ceiling;
  const pct = Math.min(100, Math.round((spent / ceiling) * 100));
  return (
    <div className={cn("rounded-[16px] border border-line bg-card p-4", className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[14px] text-muted">{t("plan.spent")}</div>
          <div className={cn("peso text-[34px] leading-none md:text-[40px]", over && "text-warn")}>{peso(spent)}</div>
        </div>
        <div className={cn("tnum text-right text-[14px]", over ? "text-warn" : "text-accent-deep")}>
          {over ? t("plan.over", { amount: peso(spent - ceiling) }) : t("plan.remaining", { amount: peso(ceiling - spent), ceiling: peso(ceiling) })}
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-valuemin={0} aria-valuemax={ceiling} aria-valuenow={spent}>
        <div className={cn("h-full rounded-full transition-[width] duration-500", over ? "bg-warn" : "bg-accent")} style={{ width: `${pct}%` }} />
      </div>
      {note && <div className="mt-2 text-[13px] text-muted">{note}</div>}
    </div>
  );
}