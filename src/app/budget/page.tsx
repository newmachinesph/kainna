import type { Metadata } from "next";
import { BudgetIndex } from "@/components/BudgetIndex";
import { currentPlanWeek } from "@/lib/dates";

export const metadata: Metadata = { title: "Filipino Meal Planning on a Budget", description: "Explore a weekly Filipino meal plan and adjust it to your household, schedule, and budget.", alternates: { canonical: "/budget" } };
export const dynamic = "force-dynamic";

export default async function Page() {
  return <BudgetIndex weekStart={currentPlanWeek()} />;
}
