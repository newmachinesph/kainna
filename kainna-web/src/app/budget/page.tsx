import type { Metadata } from "next";
import { BudgetIndex } from "@/components/BudgetIndex";
import { currentPlanWeek } from "@/lib/dates";

export const metadata: Metadata = { title: "Filipino Meal Planning on a Budget", description: "Sample 7-day Filipino meal plans at ₱200, ₱300, or ₱500 a day for 3 to 6 people, with estimated palengke prices for every ulam.", alternates: { canonical: "/budget" } };
export const dynamic = "force-dynamic";

export default async function Page() {
  return <BudgetIndex weekStart={currentPlanWeek()} />;
}
