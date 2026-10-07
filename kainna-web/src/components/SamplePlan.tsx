"use client";
import { useMemo } from "react";
import { useSalo } from "@/store/useSalo";
import { samplePlan } from "@/lib/sample";
import { currentPlanWeek } from "@/lib/dates";
import { useT } from "@/lib/useT";
import { ButtonLink } from "./Button";

/** What visitors see in the planning tools before they have made their own plan. */
export function useSamplePlan() {
  const prices = useSalo((state) => state.marketPrices);
  return useMemo(() => samplePlan(300, 4, currentPlanWeek(), "NCR", prices), [prices]);
}

export function SampleNotice() {
  const { t } = useT();
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-accent/30 bg-accent-wash px-4 py-3 text-[14px]">
      <p><span className="font-bold">{t("sample.title")}</span> <span className="text-ink-soft">{t("sample.sub")}</span></p>
      <ButtonLink href="/onboard" size="sm">{t("sample.cta")}</ButtonLink>
    </div>
  );
}
