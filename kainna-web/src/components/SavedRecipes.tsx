"use client";

import Link from "next/link";
import { FoodImage } from "@/components/FoodImage";
import { useEffect, useState } from "react";
import { ArrowRight, Bookmark } from "lucide-react";
import { guestSavedItems } from "@/lib/saved";

type SavedItem = {
  slug: string;
  image?: string;
  name_tl?: string;
  title?: string;
  protein_class?: string;
  cook_minutes?: number;
  minutes?: number;
  kind?: string;
};

export function SavedRecipes() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetch("/api/saved", { cache: "no-store" })
        .then(async (response) => {
          if (response.status === 401) return { items: await guestSavedItems<SavedItem>() };
          if (!response.ok) throw new Error("Saved recipes unavailable");
          return response.json() as Promise<{ items: SavedItem[] }>;
        })
        .then((data) => { if (active) { setItems(data.items); setError(false); } })
        .catch(() => { if (active) setError(true); })
        .finally(() => { if (active) setLoading(false); });
    };
    refresh();
    window.addEventListener("salosalo:saved", refresh);
    window.addEventListener("storage", refresh);
    return () => { active = false; window.removeEventListener("salosalo:saved", refresh); window.removeEventListener("storage", refresh); };
  }, []);

  return <div className="pb-16 pt-10">
    <p className="eyebrow">Your kitchen notebook</p>
    <h1 className="section-title mt-3">Saved recipes</h1>
    <p className="mt-3 text-ink-soft">Keep the dishes you want to cook again close at hand.</p>
    {loading ? <p className="mt-8 text-muted">Loading saved recipes...</p> : error ? <div className="mt-10 rounded-[20px] border border-line bg-card p-10 text-center"><p>Couldn&apos;t load your saved recipes. Please try again.</p></div> : items.length ? <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((item) => <Link key={item.slug} href={item.protein_class ? `/recipes/${item.slug}` : `/merienda/${item.slug}`} className="food-card"><div className="aspect-[4/3] overflow-hidden rounded-xl bg-photo">{item.image && <FoodImage src={item.image} alt={item.name_tl ?? item.title ?? item.slug} loading="lazy" />}</div><h2 className="mt-3 text-lg font-bold">{item.name_tl ?? item.title}</h2><p className="text-sm text-muted">{item.cook_minutes ?? item.minutes} min{item.kind ? ` Â· ${item.kind}` : ""}</p></Link>)}
    </div> : <div className="mt-10 rounded-[20px] border border-line bg-card p-10 text-center"><Bookmark className="mx-auto text-accent" size={28} /><h2 className="mt-3 text-xl font-bold">Your notebook is waiting.</h2><p className="mt-2 text-muted">Open a recipe and tap Save recipe to add it here.</p><Link href="/recipes" className="brand-button mt-6">Browse recipes <ArrowRight size={16} /></Link></div>}
  </div>;
}

