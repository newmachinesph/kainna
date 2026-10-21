import type { Metadata } from "next";
import { SavedRecipes } from "@/components/SavedRecipes";

export const metadata: Metadata = { title: "Saved recipes", robots: { index: false, follow: false } };
export default function SavedPage() { return <SavedRecipes />; }
