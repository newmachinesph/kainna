import type { Metadata } from "next";
import { CheckinPage } from "@/components/CheckinPage";

export const metadata: Metadata = { title: "Check-in", robots: { index: false, follow: false } };

export default function Page() {
  return <CheckinPage />;
}