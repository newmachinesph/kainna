import type { Metadata } from "next";
import { OnboardWizard } from "@/components/OnboardWizard";

export const metadata: Metadata = { title: "Set up your household", robots: { index: false, follow: false } };

export default function Page() {
  return <OnboardWizard />;
}