import type { Metadata } from "next";
import { PalengkePage } from "@/components/PalengkePage";

export const metadata: Metadata = { title: "Market list", robots: { index: false, follow: false } };

export default function Page() {
  return <PalengkePage />;
}