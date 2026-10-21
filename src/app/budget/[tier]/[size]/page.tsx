import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TIERS, BUDGET_PAGE_SIZES } from "@/lib/config";
import { BudgetWeek } from "@/components/BudgetWeek";
import { currentPlanWeek } from "@/lib/dates";

export const dynamicParams = false;
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return TIERS.flatMap((t) => BUDGET_PAGE_SIZES.map((size) => ({ tier: String(t.daily_php), size: String(size) })));
}

export async function generateMetadata({ params }: PageProps<"/budget/[tier]/[size]">): Promise<Metadata> {
  const { tier, size } = await params;
  return {
    title: `Filipino meal plan at \u20B1${tier} a day for ${size} people`,
    description: `Explore a week of Filipino dishes for ${size} people at \u20B1${tier} a day, with estimated costs and a market list.`,
    alternates: { canonical: `/budget/${tier}/${size}` },
  };
}

export default async function Page({ params }: PageProps<"/budget/[tier]/[size]">) {
  const { tier, size } = await params;
  const daily = Number(tier);
  const n = Number(size);
  if (!TIERS.some((t) => t.daily_php === daily) || !BUDGET_PAGE_SIZES.includes(n)) notFound();
  return <BudgetWeek daily={daily} size={n} weekStart={currentPlanWeek()} />;
}
