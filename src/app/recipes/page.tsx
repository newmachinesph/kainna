import type { Metadata } from "next";
import { Discover, type CatalogResult } from "@/components/Discover";
import { listCatalog } from "@/server/catalog";

export const metadata: Metadata = { title: "Filipino Food & Ulam Recipes", description: "Explore Filipino dishes from the Kain Na! collection and find ulam recipes with ingredients and cooking steps.", alternates: { canonical: "/recipes" } };

export default async function Page({ searchParams }: PageProps<"/recipes">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  // The first page is rendered on the server so the collection is crawlable without JavaScript.
  const initialResult = await listCatalog({ q: query, limit: 24, page: 1 }).catch(() => undefined) as CatalogResult | undefined;
  return <Discover initialQuery={query} initialResult={initialResult} />;
}
