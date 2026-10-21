"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen } from "lucide-react";

type Item = { id: string; title: string; category: string; image: string; source_url: string | null };
type Queue = { items: Item[]; total: number; page: number; limit: number };
const api = "";

export function CatalogRecipeEditor() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [selected, setSelected] = useState<Item | null>(null);
  const [intro, setIntro] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [servings, setServings] = useState(4);
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ q: search, page: String(page), limit: "12" });
    fetch(`${api}/v1/admin/catalog/recipe-queue?${params}`, { credentials: "include", cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Sign in as a site admin to edit catalog recipes." : "Could not load the recipe queue.");
        return response.json() as Promise<Queue>;
      })
      .then(setQueue)
      .catch((cause: Error) => setMessage(cause.message));
  }, [page, search, refresh]);

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${api}/v1/admin/catalog/${encodeURIComponent(selected.id)}/recipe`, {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intro, minutes, servings, ingredients: ingredients.split("\n").map(value => value.trim()).filter(Boolean), steps: steps.split("\n").map(value => value.trim()).filter(Boolean) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Could not publish the recipe.");
      setMessage(`${selected.title} is published with ingredients and cooking steps.`);
      setSelected(null); setIntro(""); setIngredients(""); setSteps(""); setRefresh(value => value + 1);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not publish the recipe."); }
    finally { setBusy(false); }
  }

  return <section className="mt-12 rounded-2xl border border-line bg-card p-5 md:p-7">
    <p className="eyebrow">Complete the collection</p>
    <h2 className="mt-2 text-2xl font-bold">Recipe review queue</h2>
    <p className="mt-2 text-sm text-muted">{queue ? `${queue.total.toLocaleString()} food images still need in-app instructions.` : "Loading missing recipes…"} Use the linked publisher recipe for research, then write and review Kain Na!&apos;s own ingredients and steps before publishing.</p>
    <form className="mt-5 flex gap-2" onSubmit={event => { event.preventDefault(); setPage(1); setSearch(query); setSelected(null); }}><label className="sr-only" htmlFor="recipe-queue-search">Search missing dishes</label><input id="recipe-queue-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a dish to complete" className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-paper px-4" /><button className="brand-button" type="submit">Search</button></form>
    {message && <p role="status" className="mt-4 rounded-xl bg-accent-soft p-3 text-sm">{message}</p>}
    {queue && <><div className="mt-5 grid gap-2 sm:grid-cols-2">{queue.items.map(item => <button type="button" key={item.id} onClick={() => { setSelected(item); setIntro(""); setIngredients(""); setSteps(""); setMessage(""); }} className={`flex items-center gap-3 rounded-xl border p-2 text-left transition-colors ${selected?.id === item.id ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong"}`}><img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" /><span className="min-w-0"><strong className="block truncate text-sm">{item.title}</strong><small className="text-muted">{item.category}</small></span></button>)}</div><div className="mt-5 flex items-center gap-3"><button type="button" disabled={page <= 1} onClick={() => { setPage(value => value - 1); setSelected(null); }} className="brand-button-outline disabled:opacity-40">Previous</button><span className="text-sm text-muted">Page {page} of {Math.max(1, Math.ceil(queue.total / queue.limit))}</span><button type="button" disabled={page * queue.limit >= queue.total} onClick={() => { setPage(value => value + 1); setSelected(null); }} className="brand-button-outline disabled:opacity-40">Next</button></div></>}
    {selected && <form onSubmit={publish} className="mt-8 border-t border-line pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold">{selected.title}</h3>{selected.source_url && <a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="text-link">Research source <ArrowUpRight size={15} /></a>}</div><div className="mt-5 grid gap-4"><label className="text-sm font-bold">Introduction<textarea required minLength={20} maxLength={2000} rows={3} value={intro} onChange={event => setIntro(event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-paper p-3 font-normal" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Total minutes<input required type="number" min={1} max={1440} value={minutes} onChange={event => setMinutes(Number(event.target.value))} className="mt-2 h-12 w-full rounded-xl border border-line bg-paper px-3 font-normal" /></label><label className="text-sm font-bold">Servings<input required type="number" min={1} max={40} value={servings} onChange={event => setServings(Number(event.target.value))} className="mt-2 h-12 w-full rounded-xl border border-line bg-paper px-3 font-normal" /></label></div><label className="text-sm font-bold">Ingredients, one per line<textarea required rows={8} value={ingredients} onChange={event => setIngredients(event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-paper p-3 font-normal" placeholder="1 kg fish\n2 tomatoes" /></label><label className="text-sm font-bold">Cooking steps, one per line<textarea required rows={8} value={steps} onChange={event => setSteps(event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-paper p-3 font-normal" placeholder="Prepare the ingredients…" /></label></div><button type="submit" disabled={busy} className="brand-button mt-5"><BookOpen size={17} /> {busy ? "Publishing…" : "Publish recipe"}</button></form>}
  </section>;
}
