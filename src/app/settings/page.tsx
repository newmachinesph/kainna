import type { Metadata } from "next";
import { SettingsPage } from "@/components/SettingsPage";

export const metadata: Metadata = { title: "Household", robots: { index: false, follow: false } };

export default function Page() {
  return <SettingsPage />;
}