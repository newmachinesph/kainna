import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Discover, type CatalogResult } from "@/components/Discover";

const API = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

/** `?page=N` as a positive integer; null for anything else so the page can 404. */
function pageParam(value: string | string[] | undefined): number | null {
  if (value === undefined) return 1;
  return typeof value === "string" && /^[1-9]\d{0,4}$/.test(value) ? Number(value) : null;
}

export async function generateMetadata({ searchParams }: PageProps<"/recipes">): Promise<Metadata> {
  const params = await searchParams;
  const page = pageParam(params.page) ?? 1;
  const searching = typeof params.q === "string" && params.q.trim() !== "";
  return {
    title: `Filipino Food & Ulam Recipes${page > 1 ? ` – Page ${page}` : ""}`,
    description: "Explore Filipino dishes from the Kain Na! collection and find ulam recipes with ingredients and cooking steps.",
    alternates: { canonical: page > 1 ? `/recipes?page=${page}` : "/recipes" },
    ...(searching ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function Page({ searchParams }: PageProps<"/recipes">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const page = pageParam(params.page);
  if (page === null) notFound();
  // Every page is rendered on the server so the whole collection is crawlable without JavaScript.
  const response = await fetch(`${API}/v1/catalog?limit=24&page=${page}&q=${encodeURIComponent(query)}`, { cache: "no-store" });
  const initialResult = response.ok ? await response.json() as CatalogResult : undefined;
  if (initialResult && page > 1 && page > Math.ceil(initialResult.total / initialResult.limit)) notFound();
  return <Discover key={`${page}:${query}`} initialQuery={query} initialPage={page} initialResult={initialResult} />;
}
