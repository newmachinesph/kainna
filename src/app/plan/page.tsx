import type { Metadata } from "next";
import { PlanPage } from "@/components/PlanPage";

export const metadata: Metadata = { title: "This week's plan", robots: { index: false, follow: false } };

export default function Page() {
  return <PlanPage />;
}