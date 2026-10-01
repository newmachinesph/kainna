import type { Metadata } from "next";
import { Discover } from "@/components/Discover";

export const metadata: Metadata = { title: "Filipino Food & Ulam Recipes", description: "Explore Filipino dishes from the Kain Na! collection and find ulam recipes with ingredients and cooking steps.", alternates: { canonical: "/recipes" } };

export default async function Page({ searchParams }: PageProps<"/recipes">) {
  const params = await searchParams;
  return <Discover initialCategory={typeof params.category === "string" ? params.category : "All"} initialQuery={typeof params.q === "string" ? params.q : ""} />;
}
