"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Search, SlidersHorizontal } from "lucide-react";
import { FoodImage } from "./FoodImage";
import { categoryHref, foodHref } from "@/lib/catalog-urls";

type Item = { id: string; title: string; category: string; image: string; recipe_slug: string | null; merienda_slug: string | null; has_catalog_recipe?: boolean };
export type CatalogResult = { items: Item[]; total: number; page: number; limit: number };
type Result = CatalogResult;
const categories = ["All", "Chicken", "Pork & beef", "Seafood", "Vegetables", "Rice & noodles", "Desserts", "Drinks", "More ulam"];

export function Discover({ initialCategory = "All", initialQuery = "", initialResult }: { initialCategory?: string; initialQuery?: string; initialResult?: CatalogResult }) {
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(categories.includes(initialCategory) ? initialCategory : "All");
  const [recipesOnly, setRecipesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(initialResult ?? null);
  const serverRendered = useRef(Boolean(initialResult));
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(input); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    // The first page came with the HTML; only fetch once the user changes something.
    if (serverRendered.current) { serverRendered.current = false; return; }
    const controller = new AbortController();
    const params = new URLSearchParams({ q: query, category: category === "All" ? "" : category, recipes_only: String(recipesOnly), page: String(page), limit: "24" });
    fetch(`/api/catalog?${params}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Catalog unavailable"); return response.json() as Promise<Result>; })
      .then((data) => { setResult(data); setError(false); })
      .catch((cause) => { if (cause.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, [query, category, recipesOnly, page, retry]);

  return (
    <div className="pb-12">
      <div className="border-b border-line py-10 md:py-14">
        <p className="eyebrow">The Kain Na! food collection</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 className="section-title max-w-[12ch]">Every Filipino dish, one table.</h1><p className="mt-4 max-w-[60ch] text-ink-soft">Browse the full collection. Filter for recipes with ingredients and cooking steps when you&apos;re ready to make one.</p></div><p className="text-[13px] font-bold uppercase tracking-[.12em] text-muted">{result ? `${result.total.toLocaleString()} food images` : "Loading collection..."}</p></div>
      </div>

      <div className="sticky top-16 z-20 -mx-4 border-b border-line bg-paper/95 px-4 py-4 backdrop-blur md:top-20 md:-mx-8 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-[390px]"><span className="sr-only">Search dishes</span><Search size={19} className="absolute left-4 top-3.5 text-muted" /><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search adobo, bibingka, sinigang..." className="h-12 w-full rounded-full border border-line-strong bg-card pl-11 pr-5 text-[14px] outline-none focus:border-accent" /></label>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar"><SlidersHorizontal size={17} className="mr-1 shrink-0 text-muted" />{categories.map((name) => <Link key={name} href={name === "All" ? "/recipes" : categoryHref(name)} aria-current={category === name ? "page" : undefined} className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${category === name ? "bg-ink text-white" : "border border-line bg-card text-ink-soft hover:border-ink"}`}>{name}</Link>)}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><p className="text-[14px] text-muted" aria-live="polite">{result ? `${result.total.toLocaleString()} dishes` : "Loading dishes…"}{query && ` for “${query}”`}</p><label className="flex cursor-pointer items-center gap-2 text-[14px] font-semibold text-ink"><input type="checkbox" checked={recipesOnly} onChange={(event) => { setRecipesOnly(event.target.checked); setPage(1); }} className="accent-accent" /> Recipes with cooking steps</label></div>
      {error ? <div className="mt-10 rounded-xl border border-line bg-card p-8 text-center"><p>Couldn&apos;t load the collection.</p><button type="button" className="text-link mt-3" onClick={() => setRetry((value) => value + 1)}>Try again</button></div> : !result ? <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="animate-pulse"><div className="aspect-[4/3] rounded-xl bg-paper-deep" /><div className="mt-3 h-4 w-3/4 rounded bg-paper-deep" /></div>)}</div> : result.items.length === 0 ? <div className="py-20 text-center"><p className="text-xl font-bold">No dishes found.</p><p className="mt-2 text-muted">Try another name or category.</p><button type="button" className="brand-button mt-5" onClick={() => { setInput(""); setQuery(""); setCategory("All"); setRecipesOnly(false); }}>Show all dishes</button></div> : <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">{result.items.map((item) => <Link key={item.id} href={foodHref(item)} className="food-card group"><div className="aspect-[4/3] overflow-hidden rounded-[14px] bg-photo"><FoodImage src={item.image} alt={item.title} loading="lazy" /></div><div className="px-1 pt-3"><p className="text-[11px] font-bold uppercase tracking-[.13em] text-accent">{item.category}{(item.recipe_slug || item.merienda_slug || item.has_catalog_recipe) && <span className="ml-2 inline-flex items-center text-ink" title="Recipe with ingredients and steps"><BookOpen size={12} aria-hidden="true" /><span className="sr-only">Recipe with ingredients and steps</span></span>}</p><h2 className="mt-1 line-clamp-2 text-[16px] font-bold leading-tight md:text-[19px]">{item.title}</h2></div></Link>)}</div>}
      {result && result.total > result.limit && <div className="mt-12 flex items-center justify-center gap-5"><button type="button" disabled={page === 1} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="brand-button-outline disabled:opacity-40">Previous</button><span className="text-[13px] text-muted">Page {page} of {Math.ceil(result.total / result.limit)}</span><button type="button" disabled={page >= Math.ceil(result.total / result.limit)} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="brand-button disabled:opacity-40">Next <ArrowRight size={16} /></button></div>}
    </div>
  );
}
