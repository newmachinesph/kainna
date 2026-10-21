import type { Metadata } from "next";
import { HistoryPage } from "@/components/HistoryPage";

export const metadata: Metadata = { title: "Past weeks", robots: { index: false, follow: false } };

export default function Page() {
  return <HistoryPage />;
}