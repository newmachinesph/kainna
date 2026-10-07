import type { Metadata } from "next";
import { Discover, type CatalogResult } from "@/components/Discover";

export const metadata: Metadata = { title: "Filipino Food & Ulam Recipes", description: "Explore Filipino dishes from the Kain Na! collection and find ulam recipes with ingredients and cooking steps.", alternates: { canonical: "/recipes" } };

export default async function Page({ searchParams }: PageProps<"/recipes">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  // The first page is rendered on the server so the collection is crawlable without JavaScript.
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}/v1/catalog?limit=24&page=1&q=${encodeURIComponent(query)}`, { cache: "no-store" });
  const initialResult = response.ok ? await response.json() as CatalogResult : undefined;
  return <Discover initialQuery={query} initialResult={initialResult} />;
}
